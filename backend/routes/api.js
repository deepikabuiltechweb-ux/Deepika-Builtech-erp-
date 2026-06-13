import express from 'express';
import mongoose from 'mongoose';
import Material from '../models/Material.js';
import Project from '../models/Project.js';
import Vendor from '../models/Vendor.js';
import Enquiry from '../models/Enquiry.js';
import Quotation from '../models/Quotation.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import GRN from '../models/GRN.js';
import Issue from '../models/Issue.js';
import Tool from '../models/Tool.js';
import ToolIssue from '../models/ToolIssue.js';
import EmergencyDC from '../models/EmergencyDC.js';
import { protect, authorize } from '../middleware/auth.js';
import { cache, clearCache } from '../middleware/cache.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = express.Router();

const createCRUD = (model, name) => {
  // GET ALL with Pagination & Lean Queries
  router.get(`/${name}`, protect, cache(300), asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const startIndex = (page - 1) * limit;

    const total = await model.countDocuments();
    // Using lean for performance. 
    const items = await model.find().select('-__v -password').skip(startIndex).limit(limit).lean();

    // Standard format - we MUST update frontend to handle response.data.data!
    res.status(200).json(new ApiResponse(200, items, 'Success', {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }));
  }));

  // Get one
  router.get(`/${name}/:id`, protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    let item = await model.findOne({ id: id }).lean();
    if (!item && mongoose.Types.ObjectId.isValid(id)) {
      item = await model.findById(id).lean();
    }
    if (!item) {
        res.status(404);
        throw new Error('Not found');
    }
    res.status(200).json(new ApiResponse(200, item));
  }));

  // CREATE with Cache Invalidation
  // Using broad roles here to keep frontend working since current users might be 'staff' or 'admin'
  router.post(`/${name}`, protect, authorize('superadmin', 'admin', 'manager', 'staff', 'store_team', 'purchase_team'), asyncHandler(async (req, res) => {
    const item = new model(req.body);
    const saved = await item.save();
    
    await clearCache(`/api/v1/${name}`);
    
    res.status(201).json(new ApiResponse(201, saved, 'Created successfully'));
  }));

  // UPDATE
  router.put(`/${name}/:id`, protect, authorize('superadmin', 'admin', 'manager', 'staff', 'store_team', 'purchase_team'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    let updated = await model.findOneAndUpdate({ id: id }, req.body, { new: true });
    if (!updated && mongoose.Types.ObjectId.isValid(id)) {
      updated = await model.findByIdAndUpdate(id, req.body, { new: true });
    }
    if (!updated) {
        res.status(404);
        throw new Error('Item not found');
    }
    await clearCache(`/api/v1/${name}`);
    res.status(200).json(new ApiResponse(200, updated, 'Updated successfully'));
  }));

  // DELETE with Cache Invalidation
  router.delete(`/${name}/:id`, protect, authorize('superadmin', 'admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    let deleted = await model.findOneAndDelete({ id });
    if (!deleted && mongoose.Types.ObjectId.isValid(id)) {
      deleted = await model.findByIdAndDelete(id);
    }

    if (!deleted) {
      res.status(404);
      throw new Error('Item not found');
    }

    await clearCache(`/api/v1/${name}`);
    res.status(200).json(new ApiResponse(200, null, 'Deleted successfully'));
  }));
};

// Custom DELETE for purchaseorders to handle sequential renumbering of remaining POs
router.delete('/purchaseorders/:id', protect, authorize('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Find the PO to delete
  let toDelete = await PurchaseOrder.findOne({ id });
  if (!toDelete && mongoose.Types.ObjectId.isValid(id)) {
    toDelete = await PurchaseOrder.findById(id);
  }
  
  if (!toDelete) {
    res.status(404);
    throw new Error('Purchase Order not found');
  }
  
  // Delete the PO
  await PurchaseOrder.deleteOne({ _id: toDelete._id });
  
  // Fetch all remaining POs
  const remainingPOs = await PurchaseOrder.find();
  
  // Sort them by their original numerical ID suffix
  remainingPOs.sort((a, b) => {
    const numA = parseInt(a.id?.replace(/\D/g, '') || 0);
    const numB = parseInt(b.id?.replace(/\D/g, '') || 0);
    return numA - numB;
  });
  
  // Renumber them starting from 23
  let currentNum = 23;
  for (const po of remainingPOs) {
    const newId = `PO-${String(currentNum).padStart(3, '0')}`;
    const oldId = po.id;
    
    if (oldId !== newId) {
      // Update the PO itself
      await PurchaseOrder.updateOne({ _id: po._id }, { $set: { id: newId } });
      
      // Update any referencing GRNs
      await GRN.updateMany({ poId: oldId }, { $set: { poId: newId } });
      await GRN.updateMany({ poRef: oldId }, { $set: { poRef: newId } });
    }
    currentNum++;
  }
  
  // Invalidate cache
  await clearCache('/api/v1/purchaseorders');
  await clearCache('/api/v1/grns');
  
  res.status(200).json(new ApiResponse(200, null, 'Deleted and renumbered remaining purchase orders successfully'));
}));

createCRUD(Material, 'materials');
createCRUD(Project, 'projects');
createCRUD(Vendor, 'vendors');
createCRUD(Enquiry, 'enquiries');
createCRUD(Quotation, 'quotations');
createCRUD(PurchaseOrder, 'purchaseorders');
createCRUD(GRN, 'grns');
createCRUD(Issue, 'issues');
createCRUD(Tool, 'tools');
createCRUD(ToolIssue, 'toolissues');
createCRUD(EmergencyDC, 'emergencydcs');

// Emergency DC - Approve / Reject
router.patch('/emergencydcs/:id/status', protect, authorize('superadmin', 'admin', 'manager'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  let updated = await EmergencyDC.findOneAndUpdate({ id }, { status }, { new: true });
  if (!updated && mongoose.Types.ObjectId.isValid(id)) {
    updated = await EmergencyDC.findByIdAndUpdate(id, { status }, { new: true });
  }
  if (!updated) {
    res.status(404);
    throw new Error('Emergency DC not found');
  }
  await clearCache('/api/v1/emergencydcs');
  res.status(200).json(new ApiResponse(200, updated, `DC ${status} successfully`));
}));

// GRN
router.post('/grn', protect, authorize('superadmin', 'admin', 'manager', 'staff', 'store_team'), asyncHandler(async (req, res) => {
    const { items } = req.body;
    for (const item of items) {
       await Material.findOneAndUpdate(
         { id: item.materialId },
         { 
           $inc: { currentStock: item.receivedQty },
           $set: { 
             latestPrice: item.unitPrice,
             name: item.name
           },
           $setOnInsert: {
             category: 'General',
             unit: item.unit || 'Nos',
             brand: '—',
             lastPrice: item.unitPrice,
             minLevel: 0
           }
         },
         { upsert: true, new: true }
       );
    }
    await clearCache(`/api/v1/materials`);
    res.status(200).json(new ApiResponse(200, null, 'Stock updated and GRN processed'));
}));

// Material Issue Stock Deduction
router.post('/issue', protect, authorize('superadmin', 'admin', 'manager', 'staff', 'store_team'), asyncHandler(async (req, res) => {
    const { items } = req.body;

    // ── Server-side stock validation before deducting anything ──
    for (const item of items) {
      const mat = await Material.findOne({ id: item.materialId }).lean();
      if (!mat) {
        res.status(404);
        throw new Error(`Material "${item.materialId}" not found`);
      }
      if (mat.currentStock < item.qty) {
        res.status(400);
        throw new Error(
          `Insufficient stock for "${mat.name}" (${item.materialId}). ` +
          `Available: ${mat.currentStock}, Requested: ${item.qty}`
        );
      }
    }

    // All items passed validation — now deduct atomically
    for (const item of items) {
       await Material.findOneAndUpdate(
         { id: item.materialId },
         {
           // $max ensures stock never goes below 0 as a safety net
           $inc: { currentStock: -item.qty }
         }
       );
    }
    await clearCache(`/api/v1/materials`);
    res.status(200).json(new ApiResponse(200, null, 'Stock updated and Material Issue processed'));
}));

export default router;

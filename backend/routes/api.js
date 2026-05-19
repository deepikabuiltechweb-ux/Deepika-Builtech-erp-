import express from 'express';
import mongoose from 'mongoose';
import Material from '../models/Material.js';
import Project from '../models/Project.js';
import Vendor from '../models/Vendor.js';
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
  router.post(`/${name}`, protect, authorize('superadmin', 'admin', 'manager', 'staff'), asyncHandler(async (req, res) => {
    const item = new model(req.body);
    const saved = await item.save();
    
    await clearCache(`/api/v1/${name}`);
    
    res.status(201).json(new ApiResponse(201, saved, 'Created successfully'));
  }));

  // UPDATE
  router.put(`/${name}/:id`, protect, authorize('superadmin', 'admin', 'manager', 'staff'), asyncHandler(async (req, res) => {
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

createCRUD(Material, 'materials');
createCRUD(Project, 'projects');
createCRUD(Vendor, 'vendors');

// GRN
router.post('/grn', protect, asyncHandler(async (req, res) => {
    const { items } = req.body;
    for (const item of items) {
       await Material.findOneAndUpdate(
         { id: item.materialId },
         { 
           $inc: { currentStock: item.receivedQty },
           $set: { latestPrice: item.unitPrice } 
         }
       );
    }
    await clearCache(`/api/v1/materials`);
    res.status(200).json(new ApiResponse(200, null, 'Stock updated and GRN processed'));
}));

export default router;

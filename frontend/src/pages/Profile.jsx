import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, ShieldCheck, Mail, Lock, Shield, Calendar, CheckCircle, Store, ShoppingBag, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile, grns, purchaseOrders, issues, emergencyDCs, enquiries } = useApp();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setIsUpdatingProfile(true);
      const success = await updateProfile({ profileImage: base64 });
      setIsUpdatingProfile(false);
      if (success) {
        toast.success("Profile image updated successfully!");
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file");
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return toast.error("Name is required");
    if (!profileForm.email.trim()) return toast.error("Email is required");

    setIsUpdatingProfile(true);
    const success = await updateProfile({
      name: profileForm.name,
      email: profileForm.email
    });
    setIsUpdatingProfile(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) return toast.error("Current password is required");
    if (passwordForm.newPassword.length < 6) return toast.error("New password must be at least 6 characters long");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error("Passwords do not match");

    setIsUpdatingPassword(true);
    const success = await updateProfile({
      password: passwordForm.newPassword
    });
    setIsUpdatingPassword(false);
    if (success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  // Derive some fun statistics for the user based on their role
  const userGRNCount = grns?.length || 0;
  const userPOCount = purchaseOrders?.length || 0;
  const userIssueCount = issues?.length || 0;
  const userEmergencyDCCount = emergencyDCs?.length || 0;
  const userEnquiryCount = enquiries?.length || 0;

  const displayRole = user?.role === 'admin' 
    ? 'Administrator' 
    : user?.role === 'superadmin'
    ? 'Super Administrator'
    : user?.role === 'viewer' 
    ? 'Guest Viewer' 
    : user?.role === 'store_team'
    ? 'Store Operations Lead'
    : user?.role === 'purchase_team'
    ? 'Purchase Procurement Lead'
    : 'Deepika Builtech Staff';

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-text-dark">User Profile Settings</h1>
        <p className="text-text-gray">Manage your account information, credentials, and access scopes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: User Card & Permission Scopes */}
        <div className="space-y-6 lg:col-span-1">
          {/* Main User Card */}
          <div className="card text-center p-6 space-y-4 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full translate-x-8 -translate-y-8" />
            
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner relative overflow-hidden shrink-0">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12" />
              )}
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-success rounded-full border-2 border-white flex items-center justify-center z-10">
                <CheckCircle className="w-4 h-4 text-white" />
              </span>
            </div>
            
            {['admin', 'superadmin', 'store_team', 'purchase_team'].includes(user?.role) && (
              <div className="flex flex-col items-center gap-1.5">
                <label className="cursor-pointer text-[11px] font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-3 py-1 rounded-full border border-primary/10 transition-all flex items-center gap-1">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                {user?.profileImage && (
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to remove your profile image?")) {
                        setIsUpdatingProfile(true);
                        await updateProfile({ profileImage: null });
                        setIsUpdatingProfile(false);
                        toast.success("Profile image removed");
                      }
                    }}
                    type="button"
                    className="text-[9px] font-bold text-error hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-bold text-text-dark">{user?.name}</h2>
              <p className="text-xs font-semibold text-primary tracking-wide uppercase mt-0.5">{displayRole}</p>
            </div>

            <div className="w-full h-px bg-border" />

            <div className="w-full text-left space-y-2 text-sm text-text-gray">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate" title={user?.email}>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span>Role: <strong className="text-text-dark uppercase">{user?.role}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>Active Session: <strong>Logged In</strong></span>
              </div>
            </div>
          </div>

          {/* Active Permission Scopes Card */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-text-dark flex items-center gap-2 text-sm border-b pb-2 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-primary" /> System Access Scopes
            </h3>
            
            <div className="space-y-3">
              {[
                { name: 'Admin Dashboard', enabled: user?.role === 'admin' || user?.role === 'superadmin' },
                { name: 'Store & Stock Receipt (GRN)', enabled: user?.role === 'store_team' || user?.role === 'admin' || user?.role === 'superadmin' },
                { name: 'Material Issues Log', enabled: user?.role === 'store_team' || user?.role === 'admin' || user?.role === 'superadmin' },
                { name: 'Procurement & Purchase Orders', enabled: user?.role === 'purchase_team' || user?.role === 'admin' || user?.role === 'superadmin' },
                { name: 'Vendor Bids & Quotations', enabled: user?.role === 'purchase_team' || user?.role === 'admin' || user?.role === 'superadmin' },
                { name: 'Reports & Business Intelligence', enabled: true },
              ].map(scope => (
                <div key={scope.name} className="flex justify-between items-center text-sm">
                  <span className="text-text-gray">{scope.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    scope.enabled ? 'bg-success/15 text-success border border-success/20' : 'bg-gray-100 text-text-gray border border-border'
                  }`}>
                    {scope.enabled ? 'Granted' : 'Revoked'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Portal Statistics */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-text-dark flex items-center gap-2 text-sm border-b pb-2 uppercase tracking-wide">
              <Store className="w-4 h-4 text-primary" /> Active Portal Stats
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-primary-bg p-3 rounded-lg border border-border">
                <p className="text-2xl font-bold text-primary">{userPOCount}</p>
                <p className="text-[10px] text-text-gray uppercase tracking-wider mt-0.5">PO Logs</p>
              </div>
              <div className="bg-primary-bg p-3 rounded-lg border border-border">
                <p className="text-2xl font-bold text-primary">{userGRNCount}</p>
                <p className="text-[10px] text-text-gray uppercase tracking-wider mt-0.5">GRN Receipts</p>
              </div>
              <div className="bg-primary-bg p-3 rounded-lg border border-border">
                <p className="text-2xl font-bold text-primary">{userIssueCount}</p>
                <p className="text-[10px] text-text-gray uppercase tracking-wider mt-0.5">Material Issues</p>
              </div>
              <div className="bg-primary-bg p-3 rounded-lg border border-border">
                <p className="text-2xl font-bold text-primary">{userEmergencyDCCount}</p>
                <p className="text-[10px] text-text-gray uppercase tracking-wider mt-0.5">Delivery Challans</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile & Password Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile Info */}
          <div className="card p-6">
            <h3 className="font-bold text-text-dark flex items-center gap-2 text-sm border-b pb-3 uppercase tracking-wide">
              <User className="w-4 h-4 text-primary" /> Account Information
            </h3>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-gray uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-gray uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    required
                    className="input-field text-sm"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="btn-primary px-6 flex items-center gap-2 disabled:opacity-60"
                >
                  {isUpdatingProfile ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {isUpdatingProfile ? 'Updating...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="card p-6">
            <h3 className="font-bold text-text-dark flex items-center gap-2 text-sm border-b pb-3 uppercase tracking-wide">
              <Lock className="w-4 h-4 text-primary" /> Security Credentials
            </h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-gray uppercase tracking-wide">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-field text-sm"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-gray uppercase tracking-wide">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-field text-sm"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-gray uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-field text-sm"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="btn-primary px-6 flex items-center gap-2 bg-slate-800 hover:bg-slate-900 border-none disabled:opacity-60"
                >
                  {isUpdatingPassword ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {isUpdatingPassword ? 'Updating...' : 'Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

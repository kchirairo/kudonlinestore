import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power, Tags, AlertCircle, Check, X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Category } from '../../types';
import { ConfirmationModal } from '../../components/admin/ConfirmationModal';
import { useShop } from '../../context/ShopContext';

export const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useShop();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal / Form state for Add/Edit Category
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [categorySortOrder, setCategorySortOrder] = useState<string>('1');
  const [categoryIsActive, setCategoryIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Deletion modal state
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [deletingCatName, setDeletingCatName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    const data = await adminService.getCategories();
    setCategories(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategorySlug('');
    setCategorySortOrder(String(categories.length + 1));
    setCategoryIsActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategorySlug(cat.slug);
    setCategorySortOrder(String(cat.sortOrder || 1));
    setCategoryIsActive(cat.isActive);
    setIsFormOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setIsSaving(true);
    const slugVal =
      categorySlug.trim() || categoryName.trim().toLowerCase().replace(/\s+/g, '-');

    if (editingCategoryId) {
      // Update
      const res = await adminService.updateCategory(editingCategoryId, {
        name: categoryName.trim(),
        slug: slugVal,
        sortOrder: Number(categorySortOrder),
        isActive: categoryIsActive,
      });
      setIsSaving(false);
      if (res.success) {
        showToast('Category updated successfully', 'success');
        setIsFormOpen(false);
        fetchCategories();
      } else {
        showToast(res.error || 'Failed to update category.', 'error');
      }
    } else {
      // Create
      const res = await adminService.createCategory({
        name: categoryName.trim(),
        slug: slugVal,
        sortOrder: Number(categorySortOrder),
        isActive: categoryIsActive,
      });
      setIsSaving(false);
      if (res.success) {
        showToast('Category created successfully', 'success');
        setIsFormOpen(false);
        fetchCategories();
      } else {
        showToast(res.error || 'Failed to create category.', 'error');
      }
    }
  };

  const handleToggleActive = async (cat: Category) => {
    const res = await adminService.updateCategory(cat.id, { isActive: !cat.isActive });
    if (res.success) {
      showToast(`Category "${cat.name}" status updated`, 'success');
      fetchCategories();
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCatId) return;

    setIsDeleting(true);
    const res = await adminService.deleteCategory(deletingCatId);
    setIsDeleting(false);

    if (res.success) {
      showToast('Category deleted successfully', 'info');
      setDeletingCatId(null);
      fetchCategories();
    } else {
      showToast(res.error || 'Failed to delete category.', 'error');
      setDeletingCatId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Category Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Organize product taxonomies, sort positions, and display status.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6452] hover:bg-[#ff4935] text-white font-black rounded-2xl text-xs transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Table / Card Grid */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
          <div className="h-14 bg-gray-200 rounded-2xl" />
          <div className="h-14 bg-gray-200 rounded-2xl" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-3">
          <Tags className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-base font-bold text-gray-900">No categories found</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#ff6452] text-white font-bold rounded-2xl text-xs"
          >
            Create First Category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Category Name</th>
                  <th className="py-3.5 px-6">URL Slug</th>
                  <th className="py-3.5 px-6">Products Count</th>
                  <th className="py-3.5 px-6">Sort Order</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900 text-sm">{cat.name}</td>
                    <td className="py-4 px-6 font-mono text-gray-400 text-xs">/{cat.slug}</td>
                    <td className="py-4 px-6 font-bold text-gray-700">
                      {cat.productCount ?? 0} products
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-600">#{cat.sortOrder || 1}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{cat.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        className="p-2 text-gray-400 hover:text-[#ff6452] hover:bg-rose-50 rounded-xl transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingCatId(cat.id);
                          setDeletingCatName(cat.name);
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Add / Edit Category */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-gray-900">
                {editingCategoryId ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Health & Wellness"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    if (!editingCategoryId) {
                      setCategorySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800">URL Slug</label>
                <input
                  type="text"
                  placeholder="health-wellness"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800">Sort Position Order</label>
                <input
                  type="number"
                  min="1"
                  value={categorySortOrder}
                  onChange={(e) => setCategorySortOrder(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 pt-1">
                <input
                  type="checkbox"
                  checked={categoryIsActive}
                  onChange={(e) => setCategoryIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-[#ff6452]"
                />
                <span>Active Category</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#ff6452] text-white font-black rounded-xl text-xs shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={Boolean(deletingCatId)}
        title="Delete Category?"
        message={`Are you sure you want to delete category "${deletingCatName}"? Deletion will be prevented if there are active products bound to it.`}
        confirmText="Delete Category"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteCategory}
        onClose={() => setDeletingCatId(null)}
      />
    </div>
  );
};

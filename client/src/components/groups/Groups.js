import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Users, Search, Settings, Trash2 } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState({ userGroups: [], publicGroups: [] });
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (data) => {
    try {
      setCreating(true);
      const response = await axios.post('/api/groups', data);
      toast.success('Group created successfully!');
      setShowCreateForm(false);
      reset();
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await axios.post(`/api/groups/${groupId}/join`);
      toast.success('Successfully joined group!');
      fetchGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      await axios.post(`/api/groups/${groupId}/leave`);
      toast.success('Successfully left group!');
      fetchGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/groups/${groupId}`);
      toast.success('Group deleted successfully!');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const filteredUserGroups = groups.userGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPublicGroups = groups.publicGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Groups</h1>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h2>
              
              <form onSubmit={handleSubmit(handleCreateGroup)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Name</label>
                  <input
                    type="text"
                    className="input mt-1"
                    placeholder="Enter group name"
                    {...register('name', {
                      required: 'Group name is required',
                      minLength: {
                        value: 2,
                        message: 'Group name must be at least 2 characters'
                      }
                    })}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
                  <textarea
                    className="input mt-1"
                    rows="3"
                    placeholder="Enter group description"
                    {...register('description', {
                      maxLength: {
                        value: 500,
                        message: 'Description cannot exceed 500 characters'
                      }
                    })}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('isPrivate')}
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-700">
                    Private group
                  </label>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn btn-primary flex-1"
                  >
                    {creating ? 'Creating...' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      reset();
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Your Groups */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Your Groups
            </h2>

            {filteredUserGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No groups found</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-primary-600 hover:text-primary-500 mt-2"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUserGroups.map((group) => (
                  <div key={group._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{group.name}</h3>
                          {group.isPrivate && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              Private
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          {group.memberCount} members
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/chat/${group._id}`)}
                          className="btn btn-primary text-sm"
                        >
                          Chat
                        </button>
                        {group.creator === user._id && (
                          <button
                            onClick={() => handleDeleteGroup(group._id)}
                            className="btn btn-danger text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Public Groups */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Public Groups</h2>

            {filteredPublicGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No public groups available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPublicGroups.map((group) => (
                  <div key={group._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          {group.memberCount} members • Created by {group.creator?.firstName}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleJoinGroup(group._id)}
                        className="btn btn-primary text-sm"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Groups; 
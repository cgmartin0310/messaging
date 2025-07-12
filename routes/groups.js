const express = require('express');
const { body, validationResult } = require('express-validator');
const { Group, User } = require('../models');
const { authenticateToken, isGroupMember } = require('../middleware/auth');
const sequelize = require('../config/database');

const router = express.Router();

// Check if database is connected
const isDatabaseConnected = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    return false;
  }
};

// Validation middleware
const validateGroup = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('At least one member is required')
];

// Create a new group
router.post('/', authenticateToken, validateGroup, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, description, memberIds } = req.body;
    const creatorId = req.user.id;

    // Verify all member IDs exist
    const members = await User.findAll({
      where: { 
        id: memberIds,
        isActive: true 
      }
    });

    if (members.length !== memberIds.length) {
      return res.status(400).json({
        error: 'Invalid member IDs',
        message: 'One or more member IDs are invalid'
      });
    }

    // Create the group
    const group = await Group.create({
      name,
      description: description || '',
      adminId: creatorId,
      isActive: true
    });

    // Add members to the group (including the creator)
    const allMemberIds = [...new Set([creatorId, ...memberIds])];
    await group.addMembers(allMemberIds);

    // Get the group with members
    const groupWithMembers = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    res.status(201).json({
      message: 'Group created successfully',
      group: {
        id: groupWithMembers.id,
        name: groupWithMembers.name,
        description: groupWithMembers.description,
        adminId: groupWithMembers.adminId,
        memberCount: groupWithMembers.members.length,
        members: groupWithMembers.members,
        createdAt: groupWithMembers.createdAt
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      error: 'Group creation failed',
      message: 'An error occurred while creating the group'
    });
  }
});

// Test route to create a sample group
router.post('/test-create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Create a test group
    const testGroup = await Group.create({
      name: 'Test Group',
      description: 'This is a test group for debugging',
      adminId: userId,
      isActive: true
    });
    
    // Add the user as a member
    await testGroup.addMembers([userId]);
    
    res.json({
      message: 'Test group created successfully',
      group: {
        id: testGroup.id,
        name: testGroup.name,
        description: testGroup.description
      }
    });
  } catch (error) {
    console.error('Test create group error:', error);
    res.status(500).json({ error: 'Failed to create test group' });
  }
});

// Debug route to see what's in the database
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check what's in the groups table
    const allGroups = await Group.findAll({
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    // Check what's in the conversations table
    const { Conversation } = require('../models/Conversation');
    const allConversations = await Conversation.findAll({
      include: [
        {
          model: require('../models/Conversation').ConversationParticipant,
          as: 'participants'
        }
      ]
    });
    
    res.json({
      groups: allGroups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        members: g.members.map(m => ({ id: m.id, username: m.username }))
      })),
      conversations: allConversations.map(c => ({
        id: c.id,
        name: c.name,
        conversationType: c.conversationType,
        participantCount: c.participants.length
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if database is connected
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Database is not connected. Please try again later or contact support.'
      });
    }

    const userId = req.user.id;
    console.log('Fetching groups for user:', userId);

    const groups = await Group.findAll({
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ],
      where: {
        '$members.id$': userId,
        isActive: true
      }
    });

    console.log('Found groups:', groups.length);
    console.log('Group names:', groups.map(g => g.name));

    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      adminId: group.adminId,
      memberCount: group.members.length,
      isAdmin: group.adminId === userId,
      members: group.members,
      createdAt: group.createdAt
    }));

    console.log('Formatted groups:', formattedGroups.map(g => ({ id: g.id, name: g.name, memberCount: g.memberCount })));

    res.json({
      groups: formattedGroups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      error: 'Groups retrieval failed',
      message: 'An error occurred while retrieving groups'
    });
  }
});

// Get specific group
router.get('/:groupId', authenticateToken, isGroupMember, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(member => member.id === userId);
    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a member of this group to view it'
      });
    }

    res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        adminId: group.adminId,
        memberCount: group.members.length,
        isAdmin: group.adminId === userId,
        members: group.members,
        createdAt: group.createdAt
      }
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      error: 'Group retrieval failed',
      message: 'An error occurred while retrieving the group'
    });
  }
});

// Add members to group
router.post('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.id;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Member IDs required',
        message: 'Please provide an array of member IDs'
      });
    }

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Check if user is admin
    if (group.adminId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only group admins can add members'
      });
    }

    // Verify all member IDs exist
    const members = await User.findAll({
      where: { 
        id: memberIds,
        isActive: true 
      }
    });

    if (members.length !== memberIds.length) {
      return res.status(400).json({
        error: 'Invalid member IDs',
        message: 'One or more member IDs are invalid'
      });
    }

    // Add members to the group
    await group.addMembers(memberIds);

    res.json({
      message: 'Members added successfully'
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({
      error: 'Add members failed',
      message: 'An error occurred while adding members'
    });
  }
});

// Remove members from group
router.delete('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.id;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Member IDs required',
        message: 'Please provide an array of member IDs'
      });
    }

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Check if user is admin
    if (group.adminId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only group admins can remove members'
      });
    }

    // Remove members from the group
    await group.removeMembers(memberIds);

    res.json({
      message: 'Members removed successfully'
    });
  } catch (error) {
    console.error('Remove members error:', error);
    res.status(500).json({
      error: 'Remove members failed',
      message: 'An error occurred while removing members'
    });
  }
});

// Get group members
router.get('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The specified group does not exist'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(member => member.id === userId);
    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a member of this group to view members'
      });
    }

    const members = group.members.map(member => ({
      id: member.id,
      username: member.username,
      firstName: member.firstName,
      lastName: member.lastName,
      avatar: member.avatar,
      isOwner: group.adminId === member.id
    }));

    res.json({
      members
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      error: 'Group members retrieval failed',
      message: 'An error occurred while retrieving group members'
    });
  }
});

// Search users to add to groups
router.get('/search/users', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search query with at least 2 characters'
      });
    }

    const searchTerm = q.trim();
    const users = await User.findAll({
      where: {
        id: { [sequelize.Sequelize.Op.ne]: userId },
        isActive: true,
        [sequelize.Sequelize.Op.or]: [
          { username: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
          { firstName: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
          { lastName: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
          { email: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      attributes: ['id', 'username', 'firstName', 'lastName', 'avatar'],
      limit: 20
    });

    res.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        displayName: `${user.firstName} ${user.lastName}`.trim()
      }))
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: 'User search failed',
      message: 'An error occurred while searching users'
    });
  }
});

module.exports = router; 
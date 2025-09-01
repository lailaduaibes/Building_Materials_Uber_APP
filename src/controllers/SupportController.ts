import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getDB } from '../config/database-supabase';
import { validationResult } from 'express-validator';
import { createError } from '../utils/logger';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'general' | 'technical' | 'billing' | 'delivery' | 'complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  assigned_to?: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

export class SupportController {
  /**
   * Create a new support ticket
   */
  async createTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { subject, description, category, priority = 'medium' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const supabase = getDB();
      
      // Create the support ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject,
          description,
          category,
          priority,
          status: 'open'
        })
        .select()
        .single();

      if (ticketError) {
        throw createError(`Failed to create support ticket: ${ticketError.message}`, 500);
      }

      // Create initial message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: userId,
          message: description,
          is_staff_reply: false
        });

      if (messageError) {
        throw createError(`Failed to create initial message: ${messageError.message}`, 500);
      }

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's support tickets
   */
  async getUserTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const supabase = getDB();
      
      // Get user's support tickets with message count
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages (
            id,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError(`Failed to fetch support tickets: ${error.message}`, 500);
      }

      // Transform data to include message count and last message time
      const transformedTickets = tickets.map(ticket => ({
        ...ticket,
        message_count: ticket.support_messages?.length || 0,
        last_message_at: ticket.support_messages?.length > 0 
          ? ticket.support_messages[ticket.support_messages.length - 1].created_at 
          : ticket.created_at
      }));

      res.json({
        success: true,
        message: 'Support tickets retrieved successfully',
        data: transformedTickets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific ticket details with messages
   */
  async getTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const supabase = getDB();
      
      // Get ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();
      
      if (ticketError || !ticket) {
        throw createError('Ticket not found', 404);
      }

      // Get ticket messages with user details
      const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select(`
          *,
          users (
            first_name,
            last_name
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        throw createError(`Failed to fetch messages: ${messagesError.message}`, 500);
      }

      const ticketWithMessages = {
        ...ticket,
        messages: messages || []
      };

      res.json({
        success: true,
        message: 'Ticket details retrieved successfully',
        data: ticketWithMessages
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add message to ticket
   */
  async addMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { ticketId } = req.params;
      const { message } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const supabase = getDB();
      
      // Verify ticket belongs to user
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();
      
      if (ticketError || !ticket) {
        throw createError('Ticket not found', 404);
      }

      // Add message
      const { data: newMessage, error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          user_id: userId,
          message: message,
          is_staff_reply: false
        })
        .select()
        .single();

      if (messageError) {
        throw createError(`Failed to add message: ${messageError.message}`, 500);
      }

      // Update ticket status if closed
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ 
            status: 'open',
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId);

        if (updateError) {
          throw createError(`Failed to update ticket status: ${updateError.message}`, 500);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: newMessage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close a support ticket
   */
  async closeTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      const supabase = getDB();
      
      const { data: updatedTicket, error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString(),
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error || !updatedTicket) {
        throw createError('Ticket not found', 404);
      }

      res.json({
        success: true,
        message: 'Ticket closed successfully',
        data: updatedTicket
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add staff reply to ticket (Admin only)
   */
  async addStaffReply(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { ticketId } = req.params;
      const { message } = req.body;
      const staffUserId = req.user?.id;

      if (!staffUserId) {
        throw createError('Staff not authenticated', 401);
      }

      const supabase = getDB();
      
      // Verify ticket exists (no user restriction for staff)
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      
      if (ticketError || !ticket) {
        throw createError('Ticket not found', 404);
      }

      // Add staff reply
      const { data: newMessage, error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          user_id: staffUserId,
          message: message,
          is_staff_reply: true
        })
        .select()
        .single();

      if (messageError) {
        throw createError(`Failed to add staff reply: ${messageError.message}`, 500);
      }

      // Update ticket status to in_progress if it's open
      if (ticket.status === 'open') {
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId);

        if (updateError) {
          console.warn('Failed to update ticket status:', updateError.message);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Staff reply added successfully',
        data: newMessage
      });
    } catch (error) {
      next(error);
    }
  }
}

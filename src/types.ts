import { GoogleGenAI } from "@google/genai";

// Initialize Gemini for potential AI-assisted categorization or response suggestions
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'SUPERVISOR' | 'STAFF';
  unit_kerja: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'INTERNAL' | 'EXTERNAL';
  category_group: 'KEIMIGRASIAN' | 'NON_KEIMIGRASIAN';
}

export interface SLAPolicy {
  id: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  response_time_hours: number;
  resolution_time_hours: number;
}

export interface Ticket {
  id: number;
  ticket_no: string;
  type: 'INTERNAL' | 'EXTERNAL';
  source: 'WEB' | 'WHATSAPP';
  status: 'DITERIMA' | 'DIVERIFIKASI_ADMIN' | 'DIPROSES_TEKNISI' | 'PENDING' | 'SELESAI' | 'DITOLAK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reporter_name: string;
  reporter_contact: string;
  reporter_unit?: string;
  subject: string;
  description: string;
  category_id: number;
  category_name?: string;
  category_group: 'KEIMIGRASIAN' | 'NON_KEIMIGRASIAN';
  assigned_to_user_id?: number;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
  due_response_at: string;
  due_resolve_at: string;
  wa_number?: string;
  wa_chat_summary?: string;
  wa_received_at?: string;
  other_category?: string;
  is_verified: number;
  verified_by_admin?: number;
  verified_at?: string;
  technician_note?: string;
  attachment_path?: string;
  ktp_attachment_path?: string;
  feedbacks?: any[];
  timeline?: any[];
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string;
  message: string;
  created_at: string;
}

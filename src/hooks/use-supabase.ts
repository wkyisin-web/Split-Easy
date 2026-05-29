import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Group = Database['public']['Tables']['groups']['Row'];
type Bill = Database['public']['Tables']['bills']['Row'];
type Member = Database['public']['Tables']['members']['Row'];

// Fetch groups for current user
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Group[];
    },
  });
}

// Fetch a single group with members and bills
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .eq('group_id', groupId);

      if (billsError) throw billsError;

      return { group, members, bills };
    },
    enabled: !!groupId,
  });
}

// Create a new group
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

// Create a new bill
export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: {
      groupId: string;
      title: string;
      amount: number;
      paidBy: string;
    }) => {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          group_id: bill.groupId,
          title: bill.title,
          amount: bill.amount,
          paid_by: bill.paidBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group', data.group_id] });
    },
  });
}

// Add a member to a group
export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: {
      groupId: string;
      name: string;
      avatarUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from('members')
        .insert({
          group_id: member.groupId,
          name: member.name,
          avatar_url: member.avatarUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group', data.group_id] });
    },
  });
}

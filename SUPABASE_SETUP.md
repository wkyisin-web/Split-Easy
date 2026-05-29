# Supabase Setup Guide

This project is configured to use Supabase as the database backend for managing groups, members, and bills.

## 1. Configure Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase project:
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon public key**

## 2. Create Database Tables

If you already ran table setup once and got "already exists" errors, do not rerun the full block below.

Instead, run only the `app_groups` table creation block near the end of this section.

In your Supabase project, go to **SQL Editor** and run the following SQL:

```sql
-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create app_groups table for the full SplitEasy group payload
CREATE TABLE IF NOT EXISTS app_groups (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If you see an error like "Could not find the table 'public.app_groups'", make sure the above SQL has been run in your Supabase SQL editor.
-- If you already created the project tables before, run only the app_groups creation block below.

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric NOT NULL,
  paid_by uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  settled boolean DEFAULT false NOT NULL
);

-- Create bill_splits table
CREATE TABLE IF NOT EXISTS bill_splits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount numeric NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups (users can only see their own groups)
CREATE POLICY "Users can read their own groups"
  ON groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups"
  ON groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups"
  ON groups FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for members
CREATE POLICY "Users can read members of their groups"
  ON members FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members to their groups"
  ON members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for bills
CREATE POLICY "Users can read bills from their groups"
  ON bills FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bills to their groups"
  ON bills FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for bill_splits
CREATE POLICY "Users can read bill splits from their groups"
  ON bill_splits FOR SELECT
  USING (
    bill_id IN (
      SELECT id FROM bills 
      WHERE group_id IN (
        SELECT id FROM groups WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert bill splits to their bills"
  ON bill_splits FOR INSERT
  WITH CHECK (
    bill_id IN (
      SELECT id FROM bills 
      WHERE group_id IN (
        SELECT id FROM groups WHERE user_id = auth.uid()
      )
    )
  );
```

If you already have `groups`, `members`, `bills`, and policies created in Supabase, run only this SQL to add the missing `app_groups` table:

```sql
CREATE TABLE IF NOT EXISTS app_groups (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## 3. Enable Authentication (Optional)

If you want to add user authentication:

1. Go to **Authentication** in your Supabase dashboard
2. Enable your preferred providers (Email, Google, GitHub, etc.)
3. The app is already configured to work with Supabase Auth

## 4. Usage in Components

Import and use the Supabase hooks in your React components:

```tsx
import { useGroups, useCreateGroup } from '@/hooks/use-supabase';

export function MyComponent() {
  const { data: groups, isLoading } = useGroups();
  const { mutate: createGroup } = useCreateGroup();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {groups?.map(group => (
        <div key={group.id}>{group.name}</div>
      ))}
      <button onClick={() => createGroup('New Group')}>
        Create Group
      </button>
    </div>
  );
}
```

## 5. Direct Supabase Client Usage

For advanced operations, use the Supabase client directly:

```tsx
import { supabase } from '@/lib/supabase';

// Query
const { data, error } = await supabase
  .from('groups')
  .select('*');

// Insert
const { data, error } = await supabase
  .from('groups')
  .insert({ name: 'New Group', user_id: userId });

// Update
const { data, error } = await supabase
  .from('groups')
  .update({ name: 'Updated Name' })
  .eq('id', groupId);

// Delete
const { error } = await supabase
  .from('groups')
  .delete()
  .eq('id', groupId);
```

## Troubleshooting

- **Missing environment variables**: Make sure `.env` file exists and contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Authentication errors**: Verify your Supabase project URL and anon key are correct
- **RLS policy errors**: Check that your RLS policies are properly configured in the Supabase dashboard
- **Type errors**: Run `supabase gen types typescript --local` to regenerate TypeScript types from your database schema

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React-Query Documentation](https://tanstack.com/query/latest)
- [TanStack Router Documentation](https://tanstack.com/router/latest)

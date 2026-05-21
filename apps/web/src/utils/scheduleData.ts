import { API_BASE_URL } from './api';

/**
 * Fetch schedule from API
 */
export const fetchSchedule = async (): Promise<Array<{
  day: string;
  classes: Array<{
    name: string;
    times: Array<{
      time: string;
      coach: string;
    }>;
  }>> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schedule`);
    if (!res.ok) throw new Error('Failed to fetch schedule');
    return await res.json();
  } catch (error) {
    console.error('Fetch schedule error:', error);
    return [];
  }
};

/**
 * Delete a schedule entry by ID
 */
export const deleteScheduleEntry = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schedule/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete schedule entry');
    return { success: true };
  } catch (error) {
    console.error('Delete schedule error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Create a new schedule entry
 */
export const createScheduleEntry = async (entry: {
  day: string;
  class_name: string;
  time: string;
  coach: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Failed to create schedule entry');
    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Create schedule error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Update a schedule entry
 */
export const updateScheduleEntry = async (
  id: string,
  entry: {
    day: string;
    class_name: string;
    time: string;
    coach: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/schedule/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Failed to update schedule entry');
    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Update schedule error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
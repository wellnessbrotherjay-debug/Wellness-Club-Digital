import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

/**
 * GET /api/schedule
 * Fetches the current class schedule from Supabase
 */
app.get('/', async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('schedule')
      .select('*')
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      // If schedule table doesn't exist, return default schedule
      if (error.message.includes 'relation "schedule" does not exist') {
        const defaultSchedule = [
          { day: 'Monday', classes: [{ name: "Pilates", times: [{ time: "10:00 - 11:00", coach: "Greg" }, { time: "15:00 - 16:00", coach: "Greg" }, { time: "19:00 - 20:00", coach: "Greg" }] }] },
          { day: 'Tuesday', classes: [{ name: "Yoga", times: [{ time: "10:00 - 11:00", coach: "Anais" }, { time: "15:00 - 16:00", coach: "Anais" }, { time: "19:00 - 20:00", coach: "Anais" }] }, { name: "Reformer Pilates", times: [{ time: "10:00 - 11:00", coach: "" }, { time: "15:00 - 16:00", coach: "" }, { time: "19:00 - 20:00", coach: "" }] }] },
          { day: 'Wednesday', classes: [{ name: "Stretching", times: [{ time: "10:00 - 11:00", coach: "Karry" }, { time: "15:00 - 16:00", coach: "Karry" }] }, { name: "Sensual Flow", times: [{ time: "19:00 - 20:00", coach: "Karry" }] }] },
          { day: 'Thursday', classes: [{ name: "Reformer Pilates", times: [{ time: "10:00 - 11:00", coach: "Greg" }, { time: "15:00 - 16:00", coach: "Greg" }, { time: "19:00 - 20:00", coach: "Greg" }] }, { name: "Kickboxing", times: [{ time: "10:00 - 11:00", coach: "Victor" }, { time: "19:00 - 20:00", coach: "Victor" }] }] },
          { day: 'Friday', classes: [{ name: "Reformer Pilates", times: [{ time: "15:00 - 16:00", coach: "Maria" }] }, { name: "Zumba", times: [{ time: "10:00 - 11:00", coach: "Maira" }, { time: "19:00 - 20:00", coach: "Maira" }] }] },
          { day: 'Saturday', classes: [{ name: "Yoga", times: [{ time: "10:00 - 11:00", coach: "Marina" }, { time: "15:00 - 16:00", coach: "Marina" }, { time: "19:00 - 20:00", coach: "Marina" }] }, { name: "Reformer Pilates", times: [{ time: "10:00 - 11:00", coach: "" }, { time: "15:00 - 16:00", coach: "" }, { time: "19:00 - 20:00", coach: "" }] }] },
          { day: 'Sunday', classes: [] }
        ];
        return c.json(defaultSchedule);
      }
      throw error;
    }

    console.log(`[GET /api/schedule] Fetched ${data?.length || 0} schedule entries`);
    return c.json(data || []);
  } catch (err: any) {
    console.error('[GET /api/schedule] Error:', err.message);
    return c.json({ error: 'Failed to fetch schedule', details: err.message }, 500);
  }
});

/**
 * DELETE /api/schedule/:id
 * Deletes a schedule entry by ID
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const { error } = await supabaseAdmin
      .from('schedule')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log(`[DELETE /api/schedule/${id}] Schedule entry deleted`);
    return c.json({ success: true, id });
  } catch (err: any) {
    console.error('[DELETE /api/schedule] Error:', err.message);
    return c.json({ error: 'Failed to delete schedule entry', details: err.message }, 500);
  }
});

/**
 * POST /api/schedule
 * Creates a new schedule entry
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    const { data, error } = await supabaseAdmin
      .from('schedule')
      .insert([body])
      .select();

    if (error) {
      throw error;
    }

    console.log(`[POST /api/schedule] Created new schedule entry`);
    return c.json({ success: true, data: data[0] });
  } catch (err: any) {
    console.error('[POST /api/schedule] Error:', err.message);
    return c.json({ error: 'Failed to create schedule entry', details: err.message }, 500);
  }
});

/**
 * PUT /api/schedule/:id
 * Updates a schedule entry by ID
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const { data, error } = await supabaseAdmin
      .from('schedule')
      .update(body)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    console.log(`[PUT /api/schedule/${id}] Updated schedule entry`);
    return c.json({ success: true, data: data[0] });
  } catch (err: any) {
    console.error('[PUT /api/schedule] Error:', err.message);
    return c.json({ error: 'Failed to update schedule entry', details: err.message }, 500);
  }
});

export default app;
/* ==========================================================================
   GET /api/facets

   Counts for the browse sidebar: how many live ads sit in each category,
   breed, division and area.

   The sidebar previously counted the demo catalogue in the browser, which was
   wrong the moment the API had different data. Computing it in SQL keeps the
   numbers honest and means the sidebar costs one request instead of a full
   listing download.
   ========================================================================== */

import { json, handleError } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  try {
    const [cats, subs, locs, areas, total] = await Promise.all([
      env.DB.prepare(
        `SELECT category_id AS id, COUNT(*) AS n
           FROM ads WHERE status = 'active'
          GROUP BY category_id`,
      ).all(),
      env.DB.prepare(
        `SELECT category_id AS id, subcategory AS name, COUNT(*) AS n
           FROM ads WHERE status = 'active'
          GROUP BY category_id, subcategory`,
      ).all(),
      env.DB.prepare(
        `SELECT location_id AS id, COUNT(*) AS n
           FROM ads WHERE status = 'active'
          GROUP BY location_id`,
      ).all(),
      env.DB.prepare(
        `SELECT location_id AS id, area AS name, COUNT(*) AS n
           FROM ads WHERE status = 'active'
          GROUP BY location_id, area`,
      ).all(),
      env.DB.prepare(
        "SELECT COUNT(*) AS n FROM ads WHERE status = 'active'",
      ).first(),
    ]);

    /** Collapses { id, name, n } rows into { id: { name: n } }. */
    const nested = rows => {
      const out = {};
      for (const r of rows) {
        if (!out[r.id]) out[r.id] = {};
        out[r.id][r.name] = r.n;
      }
      return out;
    };

    const flat = rows => {
      const out = {};
      for (const r of rows) out[r.id] = r.n;
      return out;
    };

    return json({
      total: total?.n ?? 0,
      categories: flat(cats.results ?? []),
      subs: nested(subs.results ?? []),
      locations: flat(locs.results ?? []),
      areas: nested(areas.results ?? []),
    }, { cache: 'public, max-age=60, stale-while-revalidate=300' });
  } catch (e) {
    return handleError(e, request, env);
  }
}

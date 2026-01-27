import { z } from 'zod';
import { insertAlarmSchema, insertMedicineSchema, insertMeetingSchema, alarms, medicines, meetings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  alarms: {
    list: {
      method: 'GET' as const,
      path: '/api/alarms',
      responses: {
        200: z.array(z.custom<typeof alarms.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/alarms',
      input: insertAlarmSchema,
      responses: {
        201: z.custom<typeof alarms.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/alarms/:id',
      input: insertAlarmSchema.partial(),
      responses: {
        200: z.custom<typeof alarms.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/alarms/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  medicines: {
    list: {
      method: 'GET' as const,
      path: '/api/medicines',
      responses: {
        200: z.array(z.custom<typeof medicines.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/medicines',
      input: insertMedicineSchema,
      responses: {
        201: z.custom<typeof medicines.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/medicines/:id',
      input: insertMedicineSchema.partial(),
      responses: {
        200: z.custom<typeof medicines.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/medicines/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  meetings: {
    list: {
      method: 'GET' as const,
      path: '/api/meetings',
      responses: {
        200: z.array(z.custom<typeof meetings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/meetings',
      input: insertMeetingSchema,
      responses: {
        201: z.custom<typeof meetings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/meetings/:id',
      input: insertMeetingSchema.partial(),
      responses: {
        200: z.custom<typeof meetings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/meetings/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  upload: {
    create: {
      method: 'POST' as const,
      path: '/api/upload',
      input: z.any(), // FormData handled manually in route
      responses: {
        200: z.object({ url: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type TaskContent = {
  title: string;
  instructions?: string;
  startTime?: string;
  endTime?: string;
  tools?: string;
  started?: boolean;
  // Frontend origin metadata for display/filtering; authorization remains on the server.
  assignedById?: string;
  assignedByName?: string;
  assignedByRole?: 'owner' | 'leader' | 'admin';
  assignmentId?: string
};

const TASK_CONTENT_PREFIX = 'AGRITRACE_TASK_V1:';

export function encodeTaskContent(value: TaskContent) {
  return `${TASK_CONTENT_PREFIX}${JSON.stringify(value)}`;
}

export function decodeTaskContent(content: string): TaskContent {
  if (!content.startsWith(TASK_CONTENT_PREFIX))
    return {
      title: content,
      started: true
    };

  try {
    const value = JSON.parse(content.slice(TASK_CONTENT_PREFIX.length)) as Partial<TaskContent>;

    return typeof value.title === 'string' ? {
      ...value,
      title: value.title,
      instructions: typeof value.instructions === 'string' ? value.instructions : undefined,
      tools: typeof value.tools === 'string' ? value.tools : undefined,
      assignedById: typeof value.assignedById === 'string' ? value.assignedById : undefined,
      assignedByName: typeof value.assignedByName === 'string' ? value.assignedByName : undefined,
      assignedByRole: value.assignedByRole === 'owner' || value.assignedByRole === 'leader' || value.assignedByRole === 'admin' ? value.assignedByRole : undefined,
    } : {
      title: 'Nội dung công việc chưa đọc được.',
      started: true
    };
  } catch {
    return {
      title: 'Nội dung công việc chưa đọc được.',
      started: true
    };
  }
}


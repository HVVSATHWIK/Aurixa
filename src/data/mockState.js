export const mockState = {
  task_id: 'REQ-8829-ET',
  system_status: 'AUTONOMOUS EXECUTION ACTIVE',
  iteration: 2,
  retry_count: 1,
  telemetry: {
    raw_input: '"Analyzing global market trends for Q3 2024 with a focus on..."',
    draft_version: 'v2.1',
    status: 'Processing',
    confidence_score: 98.4,
    risk_score: 14.2,
  },
  pipeline: {
    active_node: 'COMPLIANCE',
    completed_nodes: ['INGESTION', 'DRAFTING'],
  },
  intelligence: {
    violations: [
      {
        id: 'v_01',
        type: 'FACTUAL MISMATCH',
        severity: 'CRITICAL',
        original_text: '"Growth at 15%..."',
        fixed_output: '"Projected growth at 12.4% based on historical trends"',
        resolution_status: 'AUTO-CORRECTION COMPLETE',
      },
      {
        id: 'v_02',
        type: 'TONE INCONSISTENCY',
        severity: 'MEDIUM',
        description:
          'Switch from professional to colloquial language detected in paragraph 4.',
        resolution_status: 'PENDING',
      },
    ],
    ruleset: 'Scanning against Global Regulatory Set v4.0',
  },
  audit_trail: [
    {
      timestamp: '14:22:01',
      agent: 'AGENT:COMPLIANCE',
      message: 'Scanning for high-severity risk indicators...',
    },
    {
      timestamp: '14:21:45',
      agent: 'AGENT:EDITOR',
      message: 'Refining tone for executive presentation.',
    },
    {
      timestamp: '14:21:12',
      agent: 'AGENT:DRAFTING',
      message: 'Draft v2.1 committed to neural stack.',
    },
    {
      timestamp: '14:20:58',
      agent: 'SYSTEM',
      message: 'Ingestion complete. Processing 24kb text.',
    },
  ],
};

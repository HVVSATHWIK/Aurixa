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
    briefing: [
      'Market-facing draft aligns with enterprise compliance tone and factual baseline.',
      'One tone inconsistency remains in paragraph 4 and is queued for auto-correction.',
      'Approval readiness is high once pending editorial harmonization completes.',
    ],
    entities: [
      { name: 'Global News Desk', type: 'ORG' },
      { name: 'Q3 2024', type: 'TOPIC' },
      { name: 'Global Market Trends', type: 'TOPIC' },
    ],
    provider: 'PENDING',
    provider_message: 'Awaiting first analysis run.',
    sentiment: 'NEUTRAL',
    hindi_summary:
      'Yeh dashboard abhi demo mode mein hai. Live Hindi summary ke liye backend analysis endpoint ko connect karein.',
    telugu_summary:
      'Idi demo mode saramsham. Live Telugu summary kosam backend analysis endpoint ni connect cheyandi.',
    source_url: '',
    generated_at: '',
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
  studio: {
    audio_status: 'idle',
    audio_job_id: '',
    audio_message: 'Audio generation has not started.',
    audio_url: '',
    video_status: 'idle',
    video_job_id: '',
    video_message: 'Video render has not started.',
    video_url: '',
  },
};

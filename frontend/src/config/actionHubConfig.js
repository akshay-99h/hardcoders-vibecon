export const ACTION_HUB_COPY = {
  action_hub_copy: {
    title: "Quick Action Modules",
    subtitle: "Pick one workflow, answer a few questions, and I will send a structured query to chat.",
    helper_note: "These modules use your inputs only and do not fetch live status from external websites."
  },
  common_copy: {
    open_button: "Open",
    cancel_button: "Cancel",
    submit_button: "Generate Query & Send",
    required_suffix: "*",
    validation_required: "Please fill all required fields.",
    validation_any_of: "Please provide at least one of the required inputs.",
    toast_success: "Structured query sent to chat.",
    toast_error: "Could not submit this workflow. Please review your inputs.",
    disclaimer: "Guidance only. Verify with official sources before taking legal or financial action."
  },
  action_copy: {
    application_followup_draft: {
      card_title: "Application Follow-up Draft",
      card_description: "Generate follow-up and escalation drafts for delayed applications.",
      dialog_title: "Create Follow-up Draft",
      dialog_intro: "Share your application details. I will prepare a clear follow-up + escalation request."
    },
    notice_analyzer: {
      card_title: "Notice Analyzer",
      card_description: "Break down notices into plain language, risks, and deadlines.",
      dialog_title: "Analyze Notice",
      dialog_intro: "Add notice details or upload the document. I will extract deadlines and action steps."
    },
    draft_rti_complaint: {
      card_title: "Draft RTI / Complaint",
      card_description: "Generate a structured RTI, complaint, or grievance draft.",
      dialog_title: "Draft RTI / Complaint",
      dialog_intro: "Provide facts and requested relief. I will generate a formal draft and checklist."
    },
    deadline_planner: {
      card_title: "Deadline Planner",
      card_description: "Create a milestone plan with reminders and fallback actions.",
      dialog_title: "Build Deadline Plan",
      dialog_intro: "Enter key dates and priority. I will produce a timeline and risk-aware plan."
    },
    portal_form_prep: {
      card_title: "Portal Form Prep",
      card_description: "Prepare field values, documents, and pre-submit checks.",
      dialog_title: "Prepare Portal Submission",
      dialog_intro: "Tell me what task you are filing and what you already have. I will build a prep sheet."
    },
    fraud_signal_analyzer: {
      card_title: "Scam/Fraud Message Analyzer",
      card_description: "Assess suspicious messages and get immediate safety steps.",
      dialog_title: "Analyze Suspicious Message",
      dialog_intro: "Paste message text or upload a screenshot. I will rate risk and suggest next actions."
    }
  },
  chat_preface_templates: {
    application_followup_draft: "Prepared request from Application Follow-up Draft:",
    notice_analyzer: "Prepared request from Notice Analyzer:",
    draft_rti_complaint: "Prepared request from Draft RTI / Complaint:",
    deadline_planner: "Prepared request from Deadline Planner:",
    portal_form_prep: "Prepared request from Portal Form Prep:",
    fraud_signal_analyzer: "Prepared request from Scam/Fraud Message Analyzer:"
  }
};

export const ACTION_HUB_SCHEMA = {
  schema_version: "1.0.0",
  module_id: "rakshaai_action_hub",
  template_engine: "mustache",
  submit_behavior: {
    build_prompt: true,
    send_to_chat: true,
    chat_handler: "handleSendMessage",
    close_dialog_on_submit: true,
    reset_form_on_submit: true
  },
  prompt_compose: {
    section_separator: "\n",
    response_format_prefix: "Response format:",
    response_format_bullet_prefix: "- "
  },
  actions: [
    {
      id: "application_followup_draft",
      title: "Application Follow-up Draft",
      description: "Create follow-up and escalation drafts without live tracking.",
      icon: "FileEditIcon",
      dialog: {
        title: "Application Follow-up Draft",
        submit_label: "Generate Query & Send",
        fields: [
          {
            id: "service_type",
            label: "Service Type",
            type: "select",
            required: true,
            options: ["Aadhaar", "PAN", "Passport", "Driving License", "Other"]
          },
          {
            id: "application_id",
            label: "Application ID",
            type: "text",
            required: true,
            max_length: 80
          },
          {
            id: "submitted_date",
            label: "Submitted Date",
            type: "date",
            required: true
          },
          {
            id: "last_known_update",
            label: "Last Known Update",
            type: "textarea",
            required: false,
            omit_if_empty: true
          },
          {
            id: "office_contacted",
            label: "Office Already Contacted",
            type: "textarea",
            required: false,
            omit_if_empty: true
          },
          {
            id: "problem",
            label: "Problem Faced",
            type: "textarea",
            required: true
          },
          {
            id: "desired_outcome",
            label: "Desired Outcome",
            type: "select",
            required: true,
            options: ["Status update", "Faster processing", "Formal escalation"]
          },
          {
            id: "language",
            label: "Language",
            type: "select",
            required: true,
            options: ["English", "Hindi"]
          },
          {
            id: "tone",
            label: "Tone",
            type: "select",
            required: false,
            default: "Professional",
            options: ["Professional", "Firm", "Polite"]
          }
        ]
      },
      validation: {
        required: ["service_type", "application_id", "submitted_date", "problem", "desired_outcome", "language"],
        any_of: [["last_known_update", "office_contacted"]]
      },
      prompt: {
        sections: [
          "[WORKFLOW] APPLICATION_FOLLOWUP_DRAFT",
          "Service Type: {{service_type}}",
          "Application ID: {{application_id}}",
          "Submitted Date: {{submitted_date}}",
          "Last Known Update: {{last_known_update}}",
          "Office Contacted: {{office_contacted}}",
          "Problem Faced: {{problem}}",
          "Desired Outcome: {{desired_outcome}}",
          "Language: {{language}}",
          "Tone: {{tone}}",
          "",
          "Task:",
          "1. Draft a concise follow-up message asking for status.",
          "2. Draft an escalation message if no response in 7 days.",
          "3. Provide a follow-up timeline for day 0, day 7, and day 14.",
          "4. Provide an attachment checklist."
        ],
        response_format: [
          "Follow-up Draft",
          "Escalation Draft",
          "Follow-up Timeline",
          "Attachment Checklist"
        ]
      }
    },
    {
      id: "notice_analyzer",
      title: "Notice Analyzer",
      description: "Analyze notice content, deadlines, and risks.",
      icon: "SearchSquareIcon",
      dialog: {
        title: "Notice Analyzer",
        submit_label: "Generate Query & Send",
        fields: [
          {
            id: "notice_type",
            label: "Notice Type",
            type: "select",
            required: true,
            options: ["Tax", "Legal", "Police", "Municipal", "Banking/Financial", "Other"]
          },
          {
            id: "issuer",
            label: "Issued By",
            type: "text",
            required: true
          },
          {
            id: "notice_date",
            label: "Notice Date",
            type: "date",
            required: true
          },
          {
            id: "response_deadline",
            label: "Response Deadline",
            type: "date",
            required: false,
            omit_if_empty: true
          },
          {
            id: "state",
            label: "State/UT",
            type: "text",
            required: true
          },
          {
            id: "notice_text",
            label: "Notice Text",
            type: "textarea",
            required: false,
            omit_if_empty: true
          },
          {
            id: "notice_file",
            label: "Upload Notice (optional)",
            type: "file",
            required: false,
            accept: [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
            omit_if_empty: true
          },
          {
            id: "language",
            label: "Language",
            type: "select",
            required: true,
            options: ["English", "Hindi"]
          }
        ]
      },
      validation: {
        required: ["notice_type", "issuer", "notice_date", "state", "language"],
        any_of: [["notice_text", "notice_file"]]
      },
      prompt: {
        sections: [
          "[WORKFLOW] ANALYZE_NOTICE",
          "Notice Type: {{notice_type}}",
          "Issued By: {{issuer}}",
          "Notice Date: {{notice_date}}",
          "Response Deadline: {{response_deadline}}",
          "State/UT: {{state}}",
          "Language: {{language}}",
          "",
          "Notice Content:",
          "{{notice_text}}",
          "",
          "Task:",
          "1. Explain the notice in plain language.",
          "2. Extract critical deadlines and penalties.",
          "3. List immediate next steps with priority.",
          "4. Suggest what records/evidence to keep ready."
        ],
        response_format: [
          "Plain-English Summary",
          "Deadlines and Risk Level",
          "Action Plan (24h / 3 days / 7 days)",
          "Documents to Keep Ready"
        ]
      }
    },
    {
      id: "draft_rti_complaint",
      title: "Draft RTI / Complaint",
      description: "Generate a structured draft and filing checklist.",
      icon: "Edit02Icon",
      dialog: {
        title: "Draft RTI / Complaint",
        submit_label: "Generate Query & Send",
        fields: [
          {
            id: "draft_type",
            label: "Draft Type",
            type: "select",
            required: true,
            options: ["RTI", "Complaint", "Grievance"]
          },
          {
            id: "department",
            label: "Department/Authority",
            type: "text",
            required: true
          },
          {
            id: "subject",
            label: "Subject",
            type: "text",
            required: true
          },
          {
            id: "facts",
            label: "Facts",
            type: "textarea",
            required: true
          },
          {
            id: "relief_requested",
            label: "Relief Requested",
            type: "textarea",
            required: true
          },
          {
            id: "incident_dates",
            label: "Incident Dates",
            type: "text",
            required: false,
            omit_if_empty: true
          },
          {
            id: "location",
            label: "Location",
            type: "text",
            required: false,
            omit_if_empty: true
          },
          {
            id: "language",
            label: "Language",
            type: "select",
            required: true,
            options: ["English", "Hindi"]
          }
        ]
      },
      validation: {
        required: ["draft_type", "department", "subject", "facts", "relief_requested", "language"]
      },
      prompt: {
        sections: [
          "[WORKFLOW] DRAFT_RTI_COMPLAINT",
          "Draft Type: {{draft_type}}",
          "Department/Authority: {{department}}",
          "Subject: {{subject}}",
          "Facts: {{facts}}",
          "Relief Requested: {{relief_requested}}",
          "Incident Dates: {{incident_dates}}",
          "Location: {{location}}",
          "Language: {{language}}",
          "",
          "Task:",
          "1. Draft a complete and formal {{draft_type}}.",
          "2. Keep legal language clear and concise.",
          "3. Add placeholders for personal details.",
          "4. Add a filing checklist."
        ],
        response_format: [
          "Final Draft",
          "Required Attachments",
          "Filing Steps"
        ]
      }
    },
    {
      id: "deadline_planner",
      title: "Deadline Planner",
      description: "Create a milestone plan and reminder strategy.",
      icon: "Calendar03Icon",
      dialog: {
        title: "Deadline Planner",
        submit_label: "Generate Query & Send",
        fields: [
          {
            id: "case_type",
            label: "Case Type",
            type: "text",
            required: true
          },
          {
            id: "important_dates",
            label: "Important Dates (one per line)",
            type: "textarea",
            required: true,
            placeholder: "YYYY-MM-DD: event"
          },
          {
            id: "next_deadline",
            label: "Next Deadline",
            type: "date",
            required: true
          },
          {
            id: "priority",
            label: "Priority",
            type: "select",
            required: true,
            options: ["High", "Medium", "Low"]
          },
          {
            id: "reminder_style",
            label: "Reminder Style",
            type: "select",
            required: true,
            options: ["Daily", "Every 2 days", "Weekly", "Custom"]
          },
          {
            id: "constraints",
            label: "Constraints (optional)",
            type: "textarea",
            required: false,
            omit_if_empty: true
          },
          {
            id: "language",
            label: "Language",
            type: "select",
            required: true,
            options: ["English", "Hindi"]
          }
        ]
      },
      validation: {
        required: ["case_type", "important_dates", "next_deadline", "priority", "reminder_style", "language"]
      },
      prompt: {
        sections: [
          "[WORKFLOW] DEADLINE_PLANNER",
          "Case Type: {{case_type}}",
          "Important Dates: {{important_dates}}",
          "Next Deadline: {{next_deadline}}",
          "Priority: {{priority}}",
          "Reminder Style: {{reminder_style}}",
          "Constraints: {{constraints}}",
          "Language: {{language}}",
          "",
          "Task:",
          "1. Build a milestone-based schedule.",
          "2. Add reminder checkpoints and buffer windows.",
          "3. Mark high-risk slippages.",
          "4. Provide missed-deadline recovery actions."
        ],
        response_format: [
          "Timeline Table (date | task | priority)",
          "Reminder Plan",
          "Missed-Deadline Recovery Steps"
        ]
      }
    },
    {
      id: "portal_form_prep",
      title: "Portal Form Prep",
      description: "Prepare field values and documents before portal submission.",
      icon: "TaskDailyIcon",
      dialog: {
        title: "Portal Form Prep",
        submit_label: "Generate Query & Send",
        fields: [
          {
            id: "portal_name",
            label: "Portal Name",
            type: "text",
            required: true
          },
          {
            id: "target_task",
            label: "Target Task",
            type: "text",
            required: true
          },
          {
            id: "fields_user_has",
            label: "Information You Already Have",
            type: "textarea",
            required: true
          },
          {
            id: "documents_available",
            label: "Documents Available",
            type: "textarea",
            required: true
          },
          {
            id: "known_errors",
            label: "Known Errors/Problems",
            type: "textarea",
            required: false,
            omit_if_empty: true
          },
          {
            id: "state",
            label: "State/UT",
            type: "text",
            required: false,
            omit_if_empty: true
          },
          {
            id: "language",
            label: "Language",
            type: "select",
            required: true,
            options: ["English", "Hindi"]
          }
        ]
      },
      validation: {
        required: ["portal_name", "target_task", "fields_user_has", "documents_available", "language"]
      },
      prompt: {
        sections: [
          "[WORKFLOW] PORTAL_FORM_PREP",
          "Portal Name: {{portal_name}}",
          "Target Task: {{target_task}}",
          "State/UT: {{state}}",
          "Information Available: {{fields_user_has}}",
          "Documents Available: {{documents_available}}",
          "Known Errors: {{known_errors}}",
          "Language: {{language}}",
          "",
          "Task:",
          "1. Create a field-by-field prep sheet.",
          "2. Mark missing data/documents clearly.",
          "3. Suggest validation checks before submit.",
          "4. Provide common error-prevention tips."
        ],
        response_format: [
          "Field Prep Sheet",
          "Missing Items Checklist",
          "Pre-Submit Validation Checklist",
          "Common Error Prevention"
        ]
      }
    },
    {
      id: "fraud_signal_analyzer",
      title: "Scam/Fraud Message Analyzer",
      description: "Assess fraud risk from message/screenshot without live website lookup.",
      icon: "Shield01Icon",
      dialog: {
        title: "Scam/Fraud Message Analyzer",
        submit_label: "Generate Query & Send",
        fields: [
          {
            id: "message_text",
            label: "Message Text",
            type: "textarea",
            required: false,
            omit_if_empty: true
          },
          {
            id: "message_file",
            label: "Screenshot/File (optional)",
            type: "file",
            required: false,
            accept: [".png", ".jpg", ".jpeg", ".webp", ".pdf"],
            omit_if_empty: true
          },
          {
            id: "sender",
            label: "Sender Details",
            type: "text",
            required: true
          },
          {
            id: "requested_action",
            label: "What They Asked You To Do",
            type: "textarea",
            required: true
          },
          {
            id: "data_shared_already",
            label: "Data Already Shared",
            type: "textarea",
            required: true
          },
          {
            id: "urgency_claim",
            label: "Urgency Claim",
            type: "select",
            required: true,
            options: ["No urgency", "Immediate payment", "Account block threat", "Legal threat", "Prize/benefit lure"]
          },
          {
            id: "language",
            label: "Language",
            type: "select",
            required: true,
            options: ["English", "Hindi"]
          }
        ]
      },
      validation: {
        required: ["sender", "requested_action", "data_shared_already", "urgency_claim", "language"],
        any_of: [["message_text", "message_file"]]
      },
      prompt: {
        sections: [
          "[WORKFLOW] FRAUD_SIGNAL_ANALYZER",
          "Sender: {{sender}}",
          "Requested Action: {{requested_action}}",
          "Data Already Shared: {{data_shared_already}}",
          "Urgency Claim: {{urgency_claim}}",
          "Language: {{language}}",
          "",
          "Message Content:",
          "{{message_text}}",
          "",
          "Task:",
          "1. Assess fraud risk from the provided content.",
          "2. List red flags and confidence level.",
          "3. Recommend immediate safety actions.",
          "4. Provide safe verification steps through official channels."
        ],
        response_format: [
          "Risk Verdict (Low/Medium/High)",
          "Red Flags Found",
          "Immediate Safety Actions",
          "Safe Verification Steps"
        ]
      }
    }
  ]
};

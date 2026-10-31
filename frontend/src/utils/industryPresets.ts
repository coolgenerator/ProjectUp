/**
 * Industry-specific presets for smart suggestions and auto-completion
 */

export interface IndustryPreset {
  name: string;
  icon: string;
  commonProjectTypes: string[];
  commonCompliance: string[];
  requiredExpertise: string[];
  suggestedDeliverables: string[];
  typicalStakeholders: string[];
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  biomedical: {
    name: 'Biomedical & Healthcare',
    icon: '🏥',
    commonProjectTypes: [
      'Clinical Trial Support',
      'Medical Device Development',
      'Drug Discovery Platform',
      'Healthcare Data Analytics',
      'Patient Management System',
      'Telemedicine Solution'
    ],
    commonCompliance: [
      'FDA (Food & Drug Administration)',
      'HIPAA (Health Insurance Portability)',
      'GLP (Good Laboratory Practice)',
      'IRB (Institutional Review Board)',
      'ISO 13485 (Medical Devices)',
      'GDPR (Data Protection)'
    ],
    requiredExpertise: [
      'Clinical Research',
      'Regulatory Affairs',
      'Biostatistics',
      'Medical Data Science',
      'Healthcare IT',
      'Quality Assurance'
    ],
    suggestedDeliverables: [
      'Clinical Study Report',
      'Regulatory Submission Package',
      'Data Analysis Report',
      'Protocol Development',
      'Safety Assessment',
      'Technical Documentation'
    ],
    typicalStakeholders: [
      'Clinical Team',
      'Regulatory Affairs',
      'Quality Assurance',
      'Data Management',
      'Medical Affairs',
      'Compliance Officer'
    ]
  },

  fintech: {
    name: 'Financial Services & FinTech',
    icon: '💰',
    commonProjectTypes: [
      'Payment Processing System',
      'Risk Assessment Model',
      'Fraud Detection Platform',
      'Trading Algorithm',
      'Lending Platform',
      'Wealth Management Tool'
    ],
    commonCompliance: [
      'PCI-DSS (Payment Card Security)',
      'SOC 2 (Security Controls)',
      'GDPR (Data Protection)',
      'AML/KYC (Anti-Money Laundering)',
      'SEC (Securities Regulations)',
      'Basel III (Banking Standards)'
    ],
    requiredExpertise: [
      'Financial Modeling',
      'Security Architecture',
      'Compliance & Risk',
      'Quantitative Analysis',
      'Blockchain Development',
      'Payment Systems'
    ],
    suggestedDeliverables: [
      'Security Audit Report',
      'Compliance Documentation',
      'Risk Assessment Model',
      'API Integration Guide',
      'Transaction Flow Analysis',
      'Fraud Detection Model'
    ],
    typicalStakeholders: [
      'Risk Management',
      'Compliance Team',
      'Security Team',
      'Finance Operations',
      'Legal Department',
      'Product Management'
    ]
  },

  cleantech: {
    name: 'CleanTech & Sustainability',
    icon: '🌱',
    commonProjectTypes: [
      'Energy Optimization System',
      'Carbon Tracking Platform',
      'Sustainability Analysis Tool',
      'Renewable Energy Management',
      'Waste Reduction Solution',
      'Environmental Monitoring'
    ],
    commonCompliance: [
      'ISO 14001 (Environmental Management)',
      'EPA (Environmental Protection)',
      'Carbon Credits Verification',
      'LEED Certification',
      'GHG Protocol',
      'ISO 50001 (Energy Management)'
    ],
    requiredExpertise: [
      'Environmental Engineering',
      'Data Science',
      'Energy Systems',
      'Policy Analysis',
      'Sustainability Consulting',
      'IoT & Sensors'
    ],
    suggestedDeliverables: [
      'Sustainability Report',
      'Carbon Footprint Analysis',
      'ROI Model',
      'Energy Audit Report',
      'Environmental Impact Assessment',
      'Optimization Recommendations'
    ],
    typicalStakeholders: [
      'Sustainability Team',
      'Operations',
      'Facilities Management',
      'Regulatory Affairs',
      'Finance',
      'External Auditors'
    ]
  },

  manufacturing: {
    name: 'Manufacturing & Industrial',
    icon: '🏭',
    commonProjectTypes: [
      'Process Optimization',
      'Quality Control System',
      'Supply Chain Management',
      'Predictive Maintenance',
      'Production Planning Tool',
      'Inventory Management'
    ],
    commonCompliance: [
      'ISO 9001 (Quality Management)',
      'ISO 27001 (Information Security)',
      'OSHA (Occupational Safety)',
      'Six Sigma',
      'Lean Manufacturing',
      'Industry 4.0 Standards'
    ],
    requiredExpertise: [
      'Industrial Engineering',
      'Operations Research',
      'Quality Management',
      'Supply Chain',
      'Data Analytics',
      'Automation Engineering'
    ],
    suggestedDeliverables: [
      'Process Improvement Plan',
      'Quality Metrics Dashboard',
      'ROI Analysis',
      'Efficiency Report',
      'Implementation Roadmap',
      'Training Documentation'
    ],
    typicalStakeholders: [
      'Operations Management',
      'Quality Assurance',
      'Plant Management',
      'Supply Chain Team',
      'Engineering',
      'IT Department'
    ]
  },

  retail: {
    name: 'Retail & E-commerce',
    icon: '🛒',
    commonProjectTypes: [
      'Customer Analytics Platform',
      'Inventory Optimization',
      'Personalization Engine',
      'Omnichannel Solution',
      'Demand Forecasting',
      'Loyalty Program System'
    ],
    commonCompliance: [
      'PCI-DSS (Payment Security)',
      'GDPR (Data Protection)',
      'CCPA (Consumer Privacy)',
      'Accessibility Standards',
      'Consumer Protection Laws',
      'SOC 2 (Security)'
    ],
    requiredExpertise: [
      'E-commerce Development',
      'Data Analytics',
      'UX/UI Design',
      'Digital Marketing',
      'Supply Chain',
      'Customer Experience'
    ],
    suggestedDeliverables: [
      'Customer Insights Report',
      'Sales Analytics Dashboard',
      'Conversion Optimization Plan',
      'User Journey Map',
      'A/B Testing Results',
      'Marketing ROI Analysis'
    ],
    typicalStakeholders: [
      'Marketing Team',
      'E-commerce Operations',
      'Customer Service',
      'Merchandising',
      'IT Department',
      'Finance'
    ]
  },

  edtech: {
    name: 'Education Technology',
    icon: '📚',
    commonProjectTypes: [
      'Learning Management System',
      'Student Analytics Platform',
      'Virtual Classroom Solution',
      'Assessment & Testing Tool',
      'Content Management System',
      'Student Engagement App'
    ],
    commonCompliance: [
      'FERPA (Student Privacy)',
      'COPPA (Children\'s Privacy)',
      'WCAG (Accessibility)',
      'GDPR (Data Protection)',
      'Section 508 (Accessibility)',
      'ISO 27001 (Security)'
    ],
    requiredExpertise: [
      'Educational Technology',
      'Instructional Design',
      'Data Analytics',
      'UX Design',
      'Learning Science',
      'Software Development'
    ],
    suggestedDeliverables: [
      'Learning Outcomes Report',
      'User Engagement Analysis',
      'Accessibility Audit',
      'Curriculum Integration Guide',
      'Training Materials',
      'Assessment Framework'
    ],
    typicalStakeholders: [
      'Educational Staff',
      'IT Department',
      'Administration',
      'Curriculum Team',
      'Student Services',
      'Compliance Officer'
    ]
  },

  logistics: {
    name: 'Logistics & Transportation',
    icon: '🚚',
    commonProjectTypes: [
      'Route Optimization System',
      'Fleet Management Platform',
      'Warehouse Management',
      'Last-Mile Delivery Solution',
      'Supply Chain Visibility',
      'Asset Tracking System'
    ],
    commonCompliance: [
      'DOT (Transportation Regulations)',
      'FMCSA (Motor Carrier Safety)',
      'ISO 9001 (Quality)',
      'ISO 28000 (Supply Chain Security)',
      'CTPAT (Customs Security)',
      'OSHA (Safety)'
    ],
    requiredExpertise: [
      'Logistics Engineering',
      'Operations Research',
      'Data Analytics',
      'Supply Chain Management',
      'IoT & Telematics',
      'Process Optimization'
    ],
    suggestedDeliverables: [
      'Route Optimization Report',
      'Cost Savings Analysis',
      'Performance Metrics Dashboard',
      'Implementation Plan',
      'Process Documentation',
      'ROI Assessment'
    ],
    typicalStakeholders: [
      'Operations Team',
      'Fleet Management',
      'Warehouse Management',
      'IT Department',
      'Finance',
      'Safety & Compliance'
    ]
  },

  saas: {
    name: 'SaaS & Enterprise Software',
    icon: '☁️',
    commonProjectTypes: [
      'B2B Platform Development',
      'API Integration System',
      'Analytics Dashboard',
      'Workflow Automation',
      'CRM/ERP Extension',
      'Data Integration Platform'
    ],
    commonCompliance: [
      'SOC 2 Type II',
      'ISO 27001 (Security)',
      'GDPR (Data Protection)',
      'HIPAA (if healthcare)',
      'CCPA (California Privacy)',
      'PCI-DSS (if payments)'
    ],
    requiredExpertise: [
      'Full-Stack Development',
      'Cloud Architecture',
      'DevOps',
      'API Design',
      'Security Engineering',
      'Product Management'
    ],
    suggestedDeliverables: [
      'Technical Architecture',
      'API Documentation',
      'Security Assessment',
      'Scalability Report',
      'Integration Guide',
      'User Documentation'
    ],
    typicalStakeholders: [
      'Product Management',
      'Engineering Team',
      'Security Team',
      'Customer Success',
      'Sales Engineering',
      'Executive Sponsor'
    ]
  },

  custom: {
    name: 'Custom/Other Industry',
    icon: '🔧',
    commonProjectTypes: [
      'Custom Solution',
      'Industry-Specific Platform',
      'Process Automation',
      'Data Analytics',
      'Integration Project',
      'Digital Transformation'
    ],
    commonCompliance: [],
    requiredExpertise: [],
    suggestedDeliverables: [],
    typicalStakeholders: []
  }
};

export const INDUSTRY_OPTIONS = Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => ({
  value: key,
  label: preset.name,
  icon: preset.icon
}));

/**
 * Get preset data for a specific industry
 */
export function getIndustryPreset(industry: string): IndustryPreset | null {
  return INDUSTRY_PRESETS[industry] || null;
}

/**
 * Get all available industries
 */
export function getAllIndustries(): Array<{ value: string; label: string; icon: string }> {
  return INDUSTRY_OPTIONS;
}

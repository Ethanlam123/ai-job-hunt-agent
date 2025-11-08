## MODIFIED Requirements

### Requirement: CV Analysis Workflow
The system SHALL provide a comprehensive CV analysis workflow that includes document upload, AI-powered analysis, improvement approvals, information collection, and CV generation.

#### Scenario: Complete CV Analysis Workflow with Information Collection
- **WHEN** user uploads a CV for analysis
- **AND** reviews and approves/rejects improvement suggestions
- **THEN** system SHALL present an information collection step
- **AND** system SHALL generate contextual questions based on CV content and approved improvements
- **AND** user SHALL be prompted to provide detailed information that enhances CV quality
- **AND** system SHALL use collected information to generate a personalized CV

## ADDED Requirements

### Requirement: LLM-Generated Dynamic Question Generation
The system SHALL generate completely contextual questions using LLM analysis of CV content, approved improvements, and identified gaps.

#### Scenario: Context-Aware Question Generation
- **WHEN** user completes improvement approvals
- **THEN** LLM SHALL analyze CV content, approved improvements, and gaps to generate contextual questions
- **AND** questions SHALL focus on extracting specific details, achievements, and context missing from current CV
- **AND** system SHALL prioritize questions that will most improve CV quality and effectiveness
- **AND** essential questions SHALL be marked as required

#### Scenario: Adaptive Questioning Based on CV Content
- **WHEN** CV analysis identifies specific areas needing enhancement (e.g., vague achievements, missing metrics)
- **THEN** LLM SHALL generate targeted questions to elicit detailed information for those areas
- **AND** questions SHALL adapt based on user's experience level, industry, and career stage
- **AND** questions SHALL encourage users to provide quantifiable achievements and specific examples
- **AND** user SHALL have option to skip non-essential questions

### Requirement: Information Collection Interface
The system SHALL provide an intuitive interface for collecting user information before CV generation.

#### Scenario: Dynamic Question Presentation and Navigation
- **WHEN** user reaches information collection step
- **THEN** system SHALL display LLM-generated questions with clear context and explanations
- **AND** questions SHALL be organized based on CV analysis priorities and approved improvements
- **AND** user SHALL be able to navigate between question groups
- **AND** progress indicator SHALL show completion status
- **AND** user SHALL be able to return to previous steps to review approvals

#### Scenario: Response Validation and Storage
- **WHEN** user provides answers to questions
- **THEN** system SHALL validate required responses before proceeding
- **AND** responses SHALL be stored in database linked to session
- **AND** user SHALL be able to modify responses before final CV generation

### Requirement: Enhanced CV Generation
The system SHALL use collected user information to generate personalized and effective CVs.

#### Scenario: Personalized CV Generation
- **WHEN** user completes information collection step
- **THEN** system SHALL use responses to tailor CV content and structure
- **AND** CV generation SHALL incorporate career objectives and target role information
- **AND** formatting preferences SHALL be applied to final CV output
- **AND** generated CV SHALL better align with user's career goals

#### Scenario: Response Integration
- **WHEN** generating updated CV
- **THEN** system SHALL integrate user responses with approved improvements
- **AND** responses SHALL provide context for achievement descriptions and experience highlights
- **AND** CV output SHALL reflect user's specified preferences and goals

### Requirement: Response Data Management
The system SHALL securely store and manage user responses for CV generation.

#### Scenario: Response Storage and Retrieval
- **WHEN** user submits questionnaire responses
- **THEN** responses SHALL be stored in structured JSON format
- **AND** responses SHALL be linked to user session for privacy
- **AND** responses SHALL be retrievable for CV generation process
- **AND** responses SHALL be available for review and modification

#### Scenario: Privacy and Data Handling
- **WHEN** storing user responses
- **THEN** system SHALL only collect information necessary for CV generation
- **AND** responses SHALL be subject to existing Row Level Security policies
- **AND** user SHALL maintain control over their personal information
- **AND** responses SHALL not be used for purposes beyond CV generation
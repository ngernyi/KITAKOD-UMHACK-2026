# SYSTEM ANALYSIS DOCUMENTATION (SAD)
UMHackathon 2026

---

## Introduction

[Introduction to the strategic solution - e.g., This section introduces the strategic solution of the identified problem statement highlighted in Product Review Documentation.]

**Project Name:** [Name]

---

## 1. Purpose

[Purpose of this system analysis document - e.g., The system analysis document highlights the technical scope and design-related decisions behind the development.]

**Key Elements Covered:**
- Architecture
- Data Flows
- Model Process
- Reference for developers and testers

---

## 2. Background

[Background of the problem/previous version - e.g., Company X had a wide network of [resources]. They found a market where [业务] is quite manual.]

**Previous Version:** [If any - describe the existing system]

---

## 3. System Architecture & Design

### 3.1 High Level Architecture Overview

| Component | Type | Description |
|-----------|------|-------------|
| [Component 1] | Mobile App / Web App | [Description] |
| [Component 2] | API Gateway | [Description] |
| [Component 3] | Backend Service | [Description] |
| [Component 4] | Database | [Description] |

**Architecture Description:**
[e.g., The system is primarily structured as a client-server-based system in which there are [N] types of clients. All clients communicate via Backend API layer. [Services] are deployed on [Cloud] and share a [Database].]

---

### 3.2 LL.M as Service Layer (Z.AI GLM Integration)

_The architecture must show how GLM is integrated as a service layer - not a generic "AI Module"._

#### Dependency Diagram

| Component | Interaction | Description |
|-----------|-------------|-------------|
| User Interface | → | Sends user input to Backend |
| Backend API | → | Constructs prompts and sends to GLM |
| Z.AI GLM | → | Processes prompts, generates response |
| Response Parser | → | Parses GLM response |
| System Components | ← | Receives parsed data |
| Database | ← | Stores/retrieves data |

**Questions to Answer:**
- How are prompts being constructed and sent to the GLM API?
- What goes into the context window?
- How is your system receiving, parsing the responses and passing to the next system component?
- Where are token limitations enforced or inputs chunked before reaching GLM?

#### Major API Calls

| From | To | API Endpoint | Purpose |
|------|-----|---------------|---------|
| [Client] | [API Gateway] | [Endpoint] | [Purpose] |
| [Order Service] | [Amazon RDS] | [Query] | [Purpose] |
| [Notification Service] | [External API] | [Endpoint] | [Purpose] |

---

### 3.3 Sequence Diagram (User Interaction Flow)

_Example: Place Order Flow or Core Feature Flow_

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | User | | [Action - e.g., Enter request details] |
| 2 | | API | [Validates input] |
| 3 | | GLM | [Processes request] |
| 4 | | Database | [Stores data] |
| 5 | | API | [Returns response] |
| 6 | User | | [Displays result] |

---

### 3.4 Technological Stack

| Layer | Technology | Justification |
|-------|------------|----------------|
| Frontend | [e.g., React / React Native / Vue] | [Reason] |
| Backend | [e.g., FastAPI / Express / Django] | [Reason] |
| Database | [e.g., PostgreSQL / MongoDB] | [Reason] |
| Cloud/Deployment | [e.g., AWS EC2 / RDS / S3 / Vercel] | [Reason] |
| AI/ML | Z.AI GLM | [Reason] |

---

### 3.5 Data Flow Diagram (DFD)

| Level | Description |
|-------|-------------|
| External Entities | [e.g., Users, External APIs] |
| Processes | [e.g., Data Processing, AI Processing] |
| Data Stores | [e.g., Database, Cache] |
| Data Flows | [e.g., User → API → Processing → Database] |

---

## 4. Data Flows

[Describe how data flows through the system - e.g., How the data flows from user's mobile/devices, moves through backend API, gets stored in database, and finally returns a confirmation message for the user.]

---

## 5. Model Process

[End-to-end workflow description - e.g., The model shows the end-to-end workflow of the core features: [feature 1], [feature 2], and [feature 3].]

---

## 6. Stakeholders

| Stakeholder | Role | Expectations |
|-------------|-----|-------------|
| Customer/User | [Role] | [Expectations] |
| [Stakeholder 2] | [Role] | [Expectations] |
| Development Team | Build and maintain platform | Clear API contracts, modular architecture |
| QA Team | Validate system behavior | Defined scope, request/response formats, edge cases |

---

## 7. Roles

| Role | Responsibilities | Permissions |
|------|----------------|-------------|
| [Role 1] | [Responsibilities] | [Permissions] |
| [Role 2] | [Responsibilities] | [Permissions] |

---

## 8. Changes in Major Architectural Components

| Component | Previous Version | New Version | Change Description |
|-----------|-----------------|-----------|-----------------|
| [Component] | [Old] | [New] | [Change] |

---

## 9. API Documentation Reference

| Endpoint | Method | Request | Response | Description |
|----------|-------|---------|---------|-------------|
| /api/[endpoint] | GET/POST | {JSON} | {JSON} | [Description] |

---

## 10. External Dependencies

| Service | Purpose | API Key Required | Documentation |
|---------|---------|---------------|---------------|
| [Service 1] | [Purpose] | Yes/No | [Link] |
| [Service 2] | [Purpose] | Yes/No | [Link] |
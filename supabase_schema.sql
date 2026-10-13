-- ============================================================================
-- ResolveHub Production PostgreSQL Schema for Supabase
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: departments
CREATE TABLE departments (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	department_email VARCHAR(255), 
	responsible_user_id VARCHAR(36), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

-- Table: users
CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	employee_id VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(11) NOT NULL, 
	department_id VARCHAR(36), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id)
);

-- Table: categories
CREATE TABLE categories (
	id VARCHAR(36) NOT NULL, 
	department_id VARCHAR(36) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id)
);

-- Table: subcategories
CREATE TABLE subcategories (
	id VARCHAR(36) NOT NULL, 
	category_id VARCHAR(36) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(category_id) REFERENCES categories (id)
);

-- Table: support_teams
CREATE TABLE support_teams (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	department_id VARCHAR(36) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id)
);

-- Table: sla_policies
CREATE TABLE sla_policies (
	id VARCHAR(36) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	first_response_hours INTEGER NOT NULL, 
	resolution_hours INTEGER NOT NULL, 
	priority VARCHAR(20), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

-- Table: routing_rules
CREATE TABLE routing_rules (
	id VARCHAR(36) NOT NULL, 
	department_id VARCHAR(36), 
	category_id VARCHAR(36), 
	subcategory_id VARCHAR(36), 
	support_team_id VARCHAR(36), 
	assigned_user_id VARCHAR(36), 
	default_priority VARCHAR(20) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(category_id) REFERENCES categories (id), 
	FOREIGN KEY(subcategory_id) REFERENCES subcategories (id), 
	FOREIGN KEY(support_team_id) REFERENCES support_teams (id), 
	FOREIGN KEY(assigned_user_id) REFERENCES users (id)
);

-- Table: tickets
CREATE TABLE tickets (
	id VARCHAR(36) NOT NULL, 
	ticket_number VARCHAR(20) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	description TEXT NOT NULL, 
	created_by VARCHAR(36) NOT NULL, 
	category_id VARCHAR(36) NOT NULL, 
	subcategory_id VARCHAR(36), 
	assigned_team_id VARCHAR(36), 
	assigned_to VARCHAR(36), 
	priority VARCHAR(8) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	sla_policy_id VARCHAR(36), 
	response_due_at TIMESTAMP WITHOUT TIME ZONE, 
	resolution_due_at TIMESTAMP WITHOUT TIME ZONE, 
	first_responded_at TIMESTAMP WITHOUT TIME ZONE, 
	resolved_at TIMESTAMP WITHOUT TIME ZONE, 
	closed_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(category_id) REFERENCES categories (id), 
	FOREIGN KEY(subcategory_id) REFERENCES subcategories (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id)
);

-- Table: ticket_comments
CREATE TABLE ticket_comments (
	id VARCHAR(36) NOT NULL, 
	ticket_id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	content TEXT NOT NULL, 
	is_internal BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

-- Table: ticket_attachments
CREATE TABLE ticket_attachments (
	id VARCHAR(36) NOT NULL, 
	ticket_id VARCHAR(36) NOT NULL, 
	uploaded_by VARCHAR(36) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	file_size BIGINT NOT NULL, 
	mime_type VARCHAR(100), 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id), 
	FOREIGN KEY(uploaded_by) REFERENCES users (id)
);

-- Table: ticket_escalations
CREATE TABLE ticket_escalations (
	id VARCHAR(36) NOT NULL, 
	ticket_id VARCHAR(36) NOT NULL, 
	escalation_type VARCHAR(50) NOT NULL, 
	raised_by VARCHAR(36) NOT NULL, 
	reason TEXT NOT NULL, 
	status VARCHAR(12) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id), 
	FOREIGN KEY(raised_by) REFERENCES users (id)
);

-- Table: notifications
CREATE TABLE notifications (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	sender_email VARCHAR(255) NOT NULL, 
	recipient_email VARCHAR(255) NOT NULL, 
	ticket_id VARCHAR(36), 
	ticket_number VARCHAR(50), 
	title VARCHAR(255) NOT NULL, 
	message TEXT NOT NULL, 
	delivery_status VARCHAR(50) NOT NULL, 
	is_demo BOOLEAN NOT NULL, 
	is_read BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id)
);

-- Table: faqs
CREATE TABLE faqs (
	id VARCHAR(36) NOT NULL, 
	department_id VARCHAR(36), 
	category_id VARCHAR(36), 
	question VARCHAR(500) NOT NULL, 
	answer TEXT NOT NULL, 
	is_published BOOLEAN NOT NULL, 
	created_by VARCHAR(36), 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(category_id) REFERENCES categories (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

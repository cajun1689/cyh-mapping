variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "cyh-mapping"
}

variable "instance_type" {
  description = "EC2 instance type for the backend server"
  type        = string
  default     = "t4g.micro"
}

variable "ssh_key_name" {
  description = "Name of an existing AWS key pair for SSH access to EC2"
  type        = string
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "cyh_mapping"
}

variable "db_password" {
  description = "PostgreSQL password for the application database user"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Email address for the initial admin user in the backend"
  type        = string
}

variable "admin_password" {
  description = "Initial password for the admin user (will be bcrypt-hashed on the server)"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Secret string for Express session signing"
  type        = string
  sensitive   = true
}

variable "google_api_key" {
  description = "Google Maps Geocoding API key (optional, leave empty to skip geocoding)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "domain_name" {
  description = "Custom domain name (optional). Leave empty to use the CloudFront URL."
  type        = string
  default     = ""
}

variable "github_repo_url" {
  description = "HTTPS URL of the GitHub repo to clone onto the EC2 instance"
  type        = string
  default     = "https://github.com/mapping-action-collective/healthy-transitions-backend.git"
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into the EC2 instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

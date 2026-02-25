output "ec2_ip" {
  description = "Public IP of the backend EC2 instance"
  value       = aws_eip.backend.public_ip
}

output "ec2_ssh" {
  description = "SSH command to connect to the backend server"
  value       = "ssh ec2-user@${aws_eip.backend.public_ip}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
}

output "frontend_bucket" {
  description = "S3 bucket name for frontend deployment"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "site_url" {
  description = "Public URL for the site"
  value       = local.use_custom_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "backend_url" {
  description = "Backend admin panel URL"
  value       = local.use_custom_domain ? "https://api.${var.domain_name}" : "http://${aws_eip.backend.public_ip}"
}

output "route53_nameservers" {
  description = "Nameservers to configure at your domain registrar (only if using custom domain)"
  value       = local.use_custom_domain ? aws_route53_zone.main[0].name_servers : []
}

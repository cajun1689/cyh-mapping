resource "aws_instance" "backend" {
  ami                    = data.aws_ami.al2023_arm.id
  instance_type          = var.instance_type
  key_name               = var.ssh_key_name
  vpc_security_group_ids = [aws_security_group.backend.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/scripts/user-data.sh", {
    db_host         = aws_db_instance.main.address
    db_port         = aws_db_instance.main.port
    db_name         = var.db_name
    db_password     = var.db_password
    admin_email     = var.admin_email
    admin_password  = var.admin_password
    session_secret  = var.session_secret
    google_api_key  = var.google_api_key
    github_repo_url = var.github_repo_url
    project_name    = var.project_name
    backend_port    = 5050
    domain_name     = var.domain_name
  })

  user_data_replace_on_change = true

  tags = {
    Name = "${var.project_name}-backend"
  }

  depends_on = [aws_db_instance.main]

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-backend-eip"
  }
}

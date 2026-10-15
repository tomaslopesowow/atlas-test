# Ansible Configuration

This directory contains Ansible configuration for automated server provisioning and application deployment.

## File Structure

### Configuration Files
- **`ansible.cfg`**: Ansible configuration with SSH optimizations (pipelining, ControlMaster)
- **`main.yml`**: Main playbook that orchestrates server setup and deployment
- **`vars/main.yml`**: Variables defining open ports (22, 80, 443) and configuration

### Roles

#### `roles/security/`
- **Purpose**: Server security hardening (currently disabled)
- **Files**: 
  - `tasks/main.yml`: Security tasks
  - `handlers/main.yml`: Security-related handlers
- **Status**: Commented out due to apt lock conflicts during initial server setup

#### `roles/docker/`
- **Purpose**: Install and configure Docker with Swarm mode
- **Key tasks**:
  - Install Docker CE and related packages
  - Add Docker APT repository with GPG key verification
  - Start and enable Docker service
  - Initialize Docker Swarm cluster
  - Install Python Docker SDK for Ansible modules

#### `roles/deploy/`
- **Purpose**: Deploy the Atlas application stack
- **Key tasks**:
  - Create `/var/www/app/docker/` directory structure
  - Sync Docker compose files from local to remote
  - Copy environment-specific configuration files (.env.web)
  - Login to DigitalOcean Container Registry
  - Deploy Docker stack using `compose.production.yml`
  - Force update all services to ensure latest images
  - Configure SSL certificates via nginx-certbot service

## Workflow Integration

This Ansible configuration is executed by GitHub Actions in the deployment pipeline:

1. **Triggered by**: GitHub Actions `deploy.yml` workflow
2. **Prerequisites**: Terraform must provision infrastructure first
3. **Authentication**: Uses SSH private key from GitHub secrets
4. **Target**: DigitalOcean droplet IP obtained from Terraform output
5. **Variables**: Receives DigitalOcean token and app configuration from GitHub

## Usage

The playbook is typically run via GitHub Actions, but can be executed manually:

```bash
ansible-playbook -i "SERVER_IP," main.yml \
  --private-key ~/.ssh/ansible \
  --extra-vars '{"digitalocean_token": "TOKEN"}'
```

## Known Issues

- Security role disabled due to apt lock conflicts on fresh servers
- Docker role may fail if another apt process is running during server initialization
- Manual intervention may be required for first-time server setup

## Dependencies

- Ansible collections: `community.docker`, `ansible.posix`
- Target server: Ubuntu 22.04 with root access
- Network: SSH access on port 22, HTTP/HTTPS on ports 80/443
- SSL/TLS: Let's Encrypt certificates managed by nginx-certbot
- Environment: Production configuration via .env.web file
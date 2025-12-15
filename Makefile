.PHONY: deploy update delete describe status help

# Load environment variables from .env file
ifneq (,$(wildcard .env))
    include .env
    export
endif

STACK_NAME = wbd-martech-stack
TEMPLATE_FILE = infra/cloudformation.yaml
KEY_NAME = wbd-key
REGION = us-east-1

help:
	@echo "Available commands:"
	@echo "  make deploy   - Deploy or update the CloudFormation stack"
	@echo "  make update   - Alias for deploy (updates existing stack)"
	@echo "  make delete   - Delete the CloudFormation stack"
	@echo "  make describe - Describe stack resources"
	@echo "  make status   - Show stack status"

deploy:
	@echo "Deploying CloudFormation stack..."
	aws cloudformation deploy \
		--template-file $(TEMPLATE_FILE) \
		--stack-name $(STACK_NAME) \
		--parameter-overrides \
			KeyName=$(KEY_NAME) \
			BackendCertificateArn=$(CERTIFICATE_ARN) \
			FrontendCertificateArn=$(CERTIFICATE_ARN) \
		--capabilities CAPABILITY_NAMED_IAM \
		--region $(REGION)
	@echo "Stack deployed successfully!"

update: deploy

delete:
	@echo "Deleting CloudFormation stack..."
	aws cloudformation delete-stack \
		--stack-name $(STACK_NAME) \
		--region $(REGION)
	@echo "Waiting for stack deletion..."
	aws cloudformation wait stack-delete-complete \
		--stack-name $(STACK_NAME) \
		--region $(REGION)
	@echo "Stack deleted successfully!"

describe:
	@echo "Describing stack resources..."
	aws cloudformation describe-stack-resources \
		--stack-name $(STACK_NAME) \
		--region $(REGION)

status:
	@echo "Checking stack status..."
	aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--region $(REGION) \
		--query 'Stacks[0].StackStatus' \
		--output text

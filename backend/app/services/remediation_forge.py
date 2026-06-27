from app.models.remediation import RemediationPayload

async def generate_remediation_payload(map_dict: dict) -> RemediationPayload:
    title = map_dict.get("title", "").lower()
    description = map_dict.get("description", "").lower()
    
    # 1. TLS Template
    if "tls" in title or "tls" in description:
        return RemediationPayload(
            api_payload={
                "endpoint": "/api/system/network/tls",
                "method": "PUT",
                "body": {
                    "min_version": "TLS1.3",
                    "cipher_suites": ["TLS_AES_128_GCM_SHA256", "TLS_AES_256_GCM_SHA384"]
                }
            },
            shell_script="""# REVIEW REQUIRED — DO NOT AUTO-EXECUTE
# Enable TLS 1.3 on Windows Server IIS
New-Item 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.3\\Server' -Force
New-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.3\\Server' -Name 'Enabled' -Value '1' -PropertyType 'DWord'
New-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols\\TLS 1.3\\Server' -Name 'DisabledByDefault' -Value '0' -PropertyType 'DWord'
Restart-Service W3SVC
""",
            rpa_instructions=[
                "Open Registry Editor (regedit.exe)",
                "Navigate to HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\SCHANNEL\\Protocols",
                "Create Key 'TLS 1.3\\Server'",
                "Set DWORD 'Enabled' to 1",
                "Set DWORD 'DisabledByDefault' to 0",
                "Restart IIS Service"
            ],
            target_system="Windows Server IIS (Web Portal)",
            risk_level="HIGH"
        )

    # 2. MFA Template
    if "mfa" in title or "multi-factor" in description:
        return RemediationPayload(
            api_payload={
                "endpoint": "/api/iam/policies/mfa",
                "method": "POST",
                "body": {
                    "target_groups": ["Domain Admins", "Enterprise Admins"],
                    "enforce": True,
                    "provider": "AuthenticatorApp"
                }
            },
            shell_script="""# REVIEW REQUIRED — DO NOT AUTO-EXECUTE
# Require MFA for Admin Accounts via Azure AD PowerShell
Connect-AzureAD
$Admins = Get-AzureADDirectoryRole | Where-Object {$_.DisplayName -eq 'Global Administrator'}
# Apply Conditional Access Policy for MFA (Requires JSON policy file)
New-AzureADMSConditionalAccessPolicy -DisplayName "Enforce MFA for Admins" -State "Enabled" #... parameters omitted for brevity
""",
            rpa_instructions=[
                "Log into Azure Portal",
                "Go to Azure Active Directory -> Security -> Conditional Access",
                "Click 'New Policy'",
                "Name it 'Enforce MFA for Admins'",
                "Assign to 'Global Administrator' roles",
                "Under Grant, select 'Require multi-factor authentication'",
                "Set Enable policy to 'On' and Save"
            ],
            target_system="Azure Active Directory / IAM",
            risk_level="HIGH"
        )
        
    # 3. Password Policy Template
    if "password" in title or "password" in description:
        return RemediationPayload(
            api_payload={
                "endpoint": "/api/iam/policies/password",
                "method": "PUT",
                "body": {
                    "min_length": 14,
                    "complexity": True,
                    "history_count": 24,
                    "max_age_days": 90
                }
            },
            shell_script="""# REVIEW REQUIRED — DO NOT AUTO-EXECUTE
# Update Active Directory Default Domain Password Policy
Set-ADDefaultDomainPasswordPolicy -Identity "corp.bank.local" -ComplexityEnabled $true -MaxPasswordAge "90.00:00:00" -MinPasswordLength 14 -PasswordHistoryCount 24
""",
            rpa_instructions=[
                "Open Group Policy Management Console",
                "Edit the Default Domain Policy",
                "Navigate to Computer Configuration -> Policies -> Windows Settings -> Security Settings -> Account Policies -> Password Policy",
                "Set 'Enforce password history' to 24",
                "Set 'Maximum password age' to 90",
                "Set 'Minimum password length' to 14",
                "Set 'Password must meet complexity requirements' to Enabled"
            ],
            target_system="Active Directory",
            risk_level="MEDIUM"
        )

    # Default Template
    return RemediationPayload(
        api_payload={
            "endpoint": "/api/system/generic",
            "method": "POST",
            "body": {
                "action": "remediate",
                "ref": map_dict.get("id")
            }
        },
        shell_script=f"""# REVIEW REQUIRED — DO NOT AUTO-EXECUTE
# Auto-generated script for: {map_dict.get('title')}
echo 'Please implement manual script for this task.'
""",
        rpa_instructions=[
            "Manual review required by IT admin",
            "Identify target system",
            "Apply configuration changes as per MAP description"
        ],
        target_system="Unknown Generic System",
        risk_level="MEDIUM"
    )

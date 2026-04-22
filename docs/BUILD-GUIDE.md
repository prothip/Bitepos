# How to Build BitePOS .exe via GitHub

## One-time Setup

1. Create a GitHub repo at https://github.com/new
   - Name: `bitepos` (or whatever you want)
   - **Private** (your source code!)

2. Push the code:
```bash
cd /home/teep/bitepos
git add .
git commit -m "BitePOS v1.0.0"
git remote add origin https://github.com/YOUR-USERNAME/bitepos.git
git push -u origin master
```

3. Go to repo Settings → Actions → General → Enable "Allow all actions"

## Build the .exe

### Option A: Tag-based (automatic)
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions will automatically:
- Spin up a Windows VM
- Build the .exe
- Create a GitHub Release with the installer

### Option B: Manual trigger
1. Go to repo → Actions → "Build BitePOS Windows"
2. Click "Run workflow"
3. Wait ~5 minutes
4. Download the .exe from the Artifacts section

## Download the installer

After build completes:
- **Tag release:** Go to Releases → download `BitePOS POS Setup.exe`
- **Manual build:** Go to Actions → click the run → scroll down to Artifacts → download

## Cost: FREE
- GitHub Actions gives 2,000 minutes/month free
- Each build takes ~5 minutes
- That's 400 builds per month for free
# Audio Generation for Námsbókasafn

This guide explains how to generate pre-recorded audio files for all textbook sections using Tiro TTS.

## Overview

- **25 sections** to generate
- **~262,000 characters** total
- **~6 hours** of audio
- **~350 MB** storage required

## Prerequisites

- Docker Desktop installed
- Node.js 18+
- ~4GB RAM available for Tiro TTS

## Step 1: Download Tiro TTS Models

The Icelandic voice models are available from CLARIN-IS:

1. Go to: https://repository.clarin.is/repository/xmlui/handle/20.500.12537/104
2. Download **Diljá** (2.53 GB) - recommended female voice
3. Or download **Álfur** (2.9 GB) - male voice

Extract to a `models/` folder.

## Step 2: Build Tiro TTS Docker Image

```bash
# Clone Tiro TTS
git clone https://github.com/icelandic-lt/tiro-tts.git
cd tiro-tts

# Build Docker image
docker build -t tiro-tts .
```

## Step 3: Configure Synthesis Set

Create `synthesis_set.pbtxt` configuration:

```protobuf
voice {
  voice_id: "Dilja"
  language: "is-IS"
  backend {
    espnet2 {
      model_path: "/models/dilja/model.pth"
      config_path: "/models/dilja/config.yaml"
      vocoder_path: "/models/dilja/vocoder.pkl"
    }
  }
}
```

## Step 4: Run Tiro TTS Server

```bash
docker run \
  -v /path/to/models:/models \
  -v /path/to/synthesis_set.pbtxt:/app/conf/synthesis_set.pbtxt \
  -p 8080:8080 \
  tiro-tts
```

Verify it's running:
```bash
curl http://localhost:8080/v0/voices
```

## Step 5: Generate Audio Files

```bash
# From project root
cd namsbokasafn-vefur

# Install dependencies
npm install glob tsx --save-dev

# Dry run (see what would be generated)
npx tsx scripts/generate-audio.ts --dry-run

# Generate all audio
npx tsx scripts/generate-audio.ts

# Generate specific section
npx tsx scripts/generate-audio.ts --section=1-1-efnafraedi

# Force regenerate existing files
npx tsx scripts/generate-audio.ts --force

# Use different voice
npx tsx scripts/generate-audio.ts --voice=Alfur
```

## Output

Audio files are saved alongside markdown files:

```
public/content/efnafraedi/chapters/
  01-grunnhugmyndir/
    1-1-efnafraedi-i-samhengi.md
    1-1-efnafraedi-i-samhengi.mp3  ← generated
```

## Troubleshooting

### "TTS server not available"

Make sure Docker is running and the container is started:
```bash
docker ps  # Should show tiro-tts container
```

### Out of memory

Tiro TTS needs ~2-4GB RAM. Close other applications or increase Docker memory limit.

### Slow generation

CPU-based synthesis is slow (~10-30 seconds per section). This is normal for one-time generation.

## Alternative: AWS Polly

If you prefer not to run Tiro TTS locally, you can modify the script to use AWS Polly:

1. Set up AWS credentials
2. Change `synthesizeSpeech()` to call AWS Polly API
3. Use voices "Karl" (male) or "Dora" (female)

Cost: ~$2.50 for all 262K characters.

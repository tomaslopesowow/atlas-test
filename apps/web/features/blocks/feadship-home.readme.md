# Compression

## vp9 denoised

```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf hqdn3d=0.8:0.8:1.5:1.5 \
  -c:v libvpx-vp9 \
  -b:v 0 -crf 26 \
  -deadline good \
  -cpu-used 0 \
  -row-mt 1 \
  -tile-columns 2 \
  -g 240 \
  -auto-alt-ref 1 \
  -lag-in-frames 25 \
  -pix_fmt yuv420p \
  out_vp9_hq_denoised.webm
```

## av1

```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -c:v libsvtav1 \
  -crf 28 \
  -preset 4 \
  -g 240 \
  -pix_fmt yuv420p \
  out_av1.webm
```

## vp9 for scrubbing (every frame is keyframe)

For smooth video scrubbing/seeking on scroll. Trade-off: 3-5x larger file size.

```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf hqdn3d=0.8:0.8:1.5:1.5 \
  -c:v libvpx-vp9 \
  -b:v 0 -crf 26 \
  -deadline good \
  -cpu-used 0 \
  -row-mt 1 \
  -tile-columns 2 \
  -g 1 \
  -keyint_min 1 \
  -auto-alt-ref 0 \
  -pix_fmt yuv420p \
  out_vp9_scrubbing.webm
```

## av1 for scrubbing (every frame is keyframe)

For smooth video scrubbing/seeking on scroll. Trade-off: 3-5x larger file size.

```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -c:v libsvtav1 \
  -crf 28 \
  -preset 4 \
  -g 1 \
  -keyint_min 1 \
  -pix_fmt yuv420p \
  out_av1_scrubbing.webm
```

## Resolution Variants (for scrubbing)

Native source: 1920x1920

### 1920x1920 (native)

**VP9:**
```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf hqdn3d=0.8:0.8:1.5:1.5 \
  -c:v libvpx-vp9 \
  -b:v 0 -crf 26 \
  -deadline good \
  -cpu-used 0 \
  -row-mt 1 \
  -tile-columns 2 \
  -g 1 \
  -keyint_min 1 \
  -auto-alt-ref 0 \
  -pix_fmt yuv420p \
  out_vp9_scrubbing_1920.webm
```

**AV1:**
```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -c:v libsvtav1 \
  -crf 28 \
  -preset 4 \
  -g 1 \
  -keyint_min 1 \
  -pix_fmt yuv420p \
  out_av1_scrubbing_1920.webm
```

### 1560x1560

**VP9:**
```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf "hqdn3d=0.8:0.8:1.5:1.5,scale=1560:1560:flags=lanczos" \
  -c:v libvpx-vp9 \
  -b:v 0 -crf 26 \
  -deadline good \
  -cpu-used 0 \
  -row-mt 1 \
  -tile-columns 2 \
  -g 1 \
  -keyint_min 1 \
  -auto-alt-ref 0 \
  -pix_fmt yuv420p \
  out_vp9_scrubbing_1560.webm
```

**AV1:**
```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf "scale=1560:1560:flags=lanczos" \
  -c:v libsvtav1 \
  -crf 28 \
  -preset 4 \
  -g 1 \
  -keyint_min 1 \
  -pix_fmt yuv420p \
  out_av1_scrubbing_1560.webm
```

### 1080x1080

**VP9:**
```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf "hqdn3d=0.8:0.8:1.5:1.5,scale=1080:1080:flags=lanczos" \
  -c:v libvpx-vp9 \
  -b:v 0 -crf 26 \
  -deadline good \
  -cpu-used 0 \
  -row-mt 1 \
  -tile-columns 2 \
  -g 1 \
  -keyint_min 1 \
  -auto-alt-ref 0 \
  -pix_fmt yuv420p \
  out_vp9_scrubbing_1080.webm
```

**AV1:**
```txt
ffmpeg -framerate 24 -i V1Main%03d.png \
  -vf "scale=1080:1080:flags=lanczos" \
  -c:v libsvtav1 \
  -crf 28 \
  -preset 4 \
  -g 1 \
  -keyint_min 1 \
  -pix_fmt yuv420p \
  out_av1_scrubbing_1080.webm
```
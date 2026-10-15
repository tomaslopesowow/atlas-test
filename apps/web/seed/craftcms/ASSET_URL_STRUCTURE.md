# Asset URL Structure

This document explains how to construct URLs to access original assets stored in the Craft CMS S3 bucket.

## Overview

Assets from the Craft CMS migration are stored in an AWS S3 bucket and served via CloudFront CDN.

### S3 Configuration

- **Bucket Name**: `stomp-feadship-prod`
- **CloudFront Distribution**: `https://dbj7896sklvdk.cloudfront.net`
- **Base Path**: `craft/media`

## Path Structure by Asset Type

Assets are organized in subdirectories based on their type:

### Images
- **Path Pattern**: `craft/media/images/{filename}`
- **Example**: `craft/media/images/cid_-__copyright_feadship7.jpg`
- **CloudFront URL**: `https://dbj7896sklvdk.cloudfront.net/craft/media/images/cid_-__copyright_feadship7.jpg`
- **Direct S3 URL**: `https://stomp-feadship-prod.s3.amazonaws.com/craft/media/images/cid_-__copyright_feadship7.jpg`

### PDFs and Other Files
- **Path Pattern**: `craft/media/files/{filename}`
- **Example**: `craft/media/files/Feadship-Design-Book-Carte-Blanche.pdf`
- **CloudFront URL**: `https://dbj7896sklvdk.cloudfront.net/craft/media/files/Feadship-Design-Book-Carte-Blanche.pdf`
- **Direct S3 URL**: `https://stomp-feadship-prod.s3.amazonaws.com/craft/media/files/Feadship-Design-Book-Carte-Blanche.pdf`

## URL Construction

To construct a URL for any asset, you need:

1. **Asset Kind** (`kind` field): determines the subdirectory
   - `image` → `craft/media/images/`
   - `pdf` or other → `craft/media/files/`

2. **Filename** (`filename` field): the actual filename

3. **Access Method**:
   - **Recommended**: CloudFront URL (faster, cached)
   - **Alternative**: Direct S3 URL

### Formula

```
CloudFront URL = https://dbj7896sklvdk.cloudfront.net/craft/media/{subdirectory}/{filename}

where {subdirectory} =
  - "images" if kind === "image"
  - "files" if kind === "pdf" or other
```

## Asset Statistics

- **Total Unique Assets**: 252
- **Images**: 222 assets in `craft/media/images/`
- **PDFs**: 30 assets in `craft/media/files/`

## Generated Files

### unique-assets.jsonl
Original asset metadata extracted from articles. Each line contains:
- `targetId`: Unique asset identifier
- `filename`: Original filename
- `kind`: Asset type (image, pdf)
- `width`, `height`, `size`: Asset dimensions and file size
- `dateCreated`: When asset was created

### unique-assets-with-urls.jsonl
Enhanced version with complete URL information. Each asset includes:

```json
{
  "targetId": 164,
  "filename": "cid_-__copyright_feadship7.jpg",
  "kind": "image",
  "width": "3103",
  "height": "2050",
  "size": 1171779,
  "dateCreated": "2017-06-20T13:04:50.000Z",
  "s3": {
    "bucket": "stomp-feadship-prod",
    "key": "craft/media/images/cid_-__copyright_feadship7.jpg",
    "url": "https://stomp-feadship-prod.s3.amazonaws.com/craft/media/images/cid_-__copyright_feadship7.jpg"
  },
  "cloudfront": {
    "url": "https://dbj7896sklvdk.cloudfront.net/craft/media/images/cid_-__copyright_feadship7.jpg"
  },
  "url": "https://dbj7896sklvdk.cloudfront.net/craft/media/images/cid_-__copyright_feadship7.jpg"
}
```

The `url` field provides the recommended CloudFront URL for direct access.

## Usage Scripts

### extract-unique-assets.js
Extracts all unique assets from `unique-articles.jsonl` and creates `unique-assets.jsonl`.

```bash
node extract-unique-assets.js
```

### add-asset-urls.js
Enhances assets with S3 and CloudFront URLs, creating `unique-assets-with-urls.jsonl`.

```bash
node add-asset-urls.js
```

## Access Requirements

To access these assets, you need:
- Network access to CloudFront (public)
- OR AWS credentials for direct S3 access (private)

The CloudFront URLs should work without authentication for public access.

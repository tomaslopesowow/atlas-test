# Block Thumbnails

This directory contains thumbnail images for PayloadCMS blocks used in the admin interface.

## Security

These images are **protected** and can only be accessed by authenticated PayloadCMS users.

### Access Patterns

- ✅ **Allowed**: `/api/block-thumbnails/filename.png` (requires authentication)
- ❌ **Blocked**: `/block-thumbnails/filename.png` (direct access blocked by middleware)

### Authentication

Images are served through the `/api/block-thumbnails/[filename]/route.ts` API route which:

1. Validates the user's JWT token from cookies
2. Ensures the user is authenticated with PayloadCMS
3. Validates the filename for security (no path traversal)
4. Serves the image with appropriate cache headers

### Usage in Blocks

Block definitions use the protected API route:

```typescript
export const MyBlock = createBlock({
    slug: 'my-block',
    imageURL: '/api/block-thumbnails/my-block.png', // Protected route
    // ... other config
});
```

### Adding New Thumbnails

1. Add your PNG file to this directory: `public/block-thumbnails/your-block.png`
2. Reference it in your block: `imageURL: '/api/block-thumbnails/your-block.png'`
3. The image will automatically be protected and only accessible to authenticated users

### Security Features

- JWT authentication required
- Path traversal protection
- File type validation (PNG only)
- Private caching headers
- Direct access blocked via middleware 
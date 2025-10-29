# Farcaster Mini Apps Migration Guide

This document outlines the migration from Farcaster Frames to the new Farcaster Mini Apps specification for the WOWOWIFY project.

## What Changed

Farcaster Frames have been rebranded and enhanced as **Farcaster Mini Apps**. This is not just a rebranding - Mini Apps provide significant improvements over the original frames:

- **Full Interactive Applications**: Instead of image-based frames, Mini Apps support complete web applications
- **Better Discovery**: Apps can be found in app stores and saved by users
- **Persistent Access**: Users can save and return to their favorite Mini Apps
- **Push Notifications**: Apps can send notifications to re-engage users
- **Enhanced Social Integration**: Better integration with Farcaster's social data

## Changes Made

### 1. Updated Manifest File (`/.well-known/farcaster.json`)

- Added new `miniapp` configuration section with enhanced metadata
- Maintained backward compatibility with existing `frame` section
- Added app categories, tags, author information, and permissions
- Enhanced description and metadata for better discoverability

### 2. Package Dependencies

- Updated `@farcaster/frame-sdk` to latest version (^0.0.36)
- Added `@farcaster/miniapp-sdk` (^0.1.10) for enhanced Mini App features
- Both SDKs are compatible and can be used together

### 3. Meta Tags and Embeds

Updated frame layout to include both:
- `fc:miniapp` - Primary Mini App embed tag
- `fc:frame` - Legacy frame tag for backward compatibility
- Enhanced OpenGraph and Twitter metadata
- Added Mini App specific meta tags for splash screen and icons

### 4. Mini App Utilities (`/src/lib/miniapp.ts`)

Created comprehensive utility library with:
- Mini App detection and initialization
- User context management
- Social sharing functions
- Analytics tracking
- Consistent meta tag generation
- Lifecycle management hooks

### 5. Next.js Configuration

- Added security headers for Mini App embedding
- Configured Content Security Policy to allow iframe embedding
- Added caching headers for manifest file
- Maintained turbo mode compatibility

### 6. Frame Component Updates

- Integrated Mini App SDK initialization
- Added Mini App context detection
- Enhanced error handling and logging
- Maintained backward compatibility with existing frame functionality

## Backward Compatibility

The migration maintains full backward compatibility:

- Existing frame functionality continues to work
- Both `fc:frame` and `fc:miniapp` meta tags are present
- Original webhook handlers remain functional
- No breaking changes to the user interface

## Mini App Features Now Available

### 1. App Store Discovery
Your app can now be discovered in Farcaster client app stores through the enhanced manifest configuration.

### 2. User Persistence
Users can save your app to their app list for easy access.

### 3. Enhanced Context
Better access to user information and social context through the Mini App SDK.

### 4. Analytics
Built-in event tracking for user interactions and engagement metrics.

### 5. Social Sharing
Improved sharing capabilities directly integrated with Farcaster's compose flow.

## Environment Variables

No new environment variables are required for basic Mini App functionality. The app will work with existing configuration.

Optional for enhanced features:
- Analytics integration (if using third-party analytics)
- Enhanced debugging (existing debug flags continue to work)

## Testing the Migration

1. **Build the application**: `npm run build`
2. **Local testing**: `npm run dev`
3. **Verify manifest**: Check `https://yourdomain.com/.well-known/farcaster.json`
4. **Test in Farcaster clients**: Share your Mini App URL in a cast to test embedding

## Key Benefits

1. **Enhanced User Experience**: Full web app capabilities instead of limited frame interactions
2. **Better Discovery**: App store listings and search functionality
3. **User Retention**: Saved apps and notification capabilities
4. **Rich Interactions**: Complete UI/UX possibilities with standard web technologies
5. **Social Integration**: Deeper integration with Farcaster's social graph

## Migration Checklist

- [x] Updated manifest file with Mini App configuration
- [x] Added both `fc:miniapp` and `fc:frame` meta tags
- [x] Updated dependencies to latest versions
- [x] Created Mini App utility library
- [x] Updated Next.js configuration for embedding
- [x] Enhanced frame component with Mini App SDK
- [x] Maintained backward compatibility
- [x] Fixed TypeScript and build issues
- [x] Documented changes

## Future Enhancements

With the Mini App foundation now in place, you can:

1. **Add Push Notifications**: Implement webhook handlers for notification events
2. **Enhanced Analytics**: Integrate detailed user behavior tracking
3. **App Store Optimization**: Optimize metadata for better discoverability
4. **Advanced Features**: Utilize additional Mini App SDK capabilities as they become available

## Resources

- [Farcaster Mini Apps Documentation](https://miniapps.farcaster.xyz/)
- [Mini App SDK Reference](https://miniapps.farcaster.xyz/docs/sdk)
- [Manifest Configuration Guide](https://miniapps.farcaster.xyz/docs/guides/manifest-vs-embed)
- [Publishing Guide](https://miniapps.farcaster.xyz/docs/guides/publishing)

The migration is complete and your app now supports the full Farcaster Mini Apps specification while maintaining compatibility with existing frame functionality.
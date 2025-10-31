import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setStillImageFormat('png');
Config.setAudioCodec('aac');
Config.setDelayRenderTimeoutInMilliseconds(120000);
// Force software-only rendering (no GPU) using SwiftShader
Config.setChromiumOpenGlRenderer('swiftshader');

import { Composition } from 'remotion';
import { Walkthrough } from './Walkthrough';
import { FPS } from './brand';
import storyboard from './generated/storyboard.json';

const last = storyboard.scenes[storyboard.scenes.length - 1];
const DURATION = (last.start + last.dur) * FPS;

export const RemotionRoot = () => (
  <>
    <Composition id="Walkthrough" component={Walkthrough} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ vertical: false }} />
    <Composition id="WalkthroughVertical" component={Walkthrough} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ vertical: true }} />
  </>
);

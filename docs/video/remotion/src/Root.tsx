import { Composition } from 'remotion';
import { Walkthrough } from './Walkthrough';
import { CuriTruck } from './CuriTruck';
import { CuriWord } from './CuriWord';
import { CuriTour, TOUR_FRAMES } from './CuriTour';
import { FPS } from './brand';
import storyboard from './generated/storyboard.json';

const last = storyboard.scenes[storyboard.scenes.length - 1];
const DURATION = (last.start + last.dur) * FPS;

export const RemotionRoot = () => (
  <>
    <Composition id="Walkthrough" component={Walkthrough} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ vertical: false }} />
    <Composition id="CuriTruck" component={CuriTruck} durationInFrames={300} fps={FPS} width={1080} height={1920} />
    <Composition id="CuriWord" component={CuriWord} durationInFrames={420} fps={FPS} width={1080} height={1920} />
    <Composition id="CuriTour" component={CuriTour} durationInFrames={TOUR_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="WalkthroughVertical" component={Walkthrough} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ vertical: true }} />
  </>
);

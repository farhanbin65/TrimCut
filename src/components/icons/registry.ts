import { Media } from './Media';
import { Audio } from './Audio';
import { Text } from './Text';
import { Stickers } from './Stickers';
import { Effects } from './Effects';
import { Transitions } from './Transitions';
import { Captions } from './Captions';
import { Filters } from './Filters';
import { Adjustment } from './Adjustment';
import { Templates } from './Templates';
import { Import } from './Import';
import { Export } from './Export';
import { Settings } from './Settings';
import { Undo } from './Undo';
import { Redo } from './Redo';
import { Select } from './Select';
import { Split } from './Split';
import { Delete } from './Delete';
import { TrimLeft } from './TrimLeft';
import { TrimRight } from './TrimRight';
import { Ripple } from './Ripple';
import { Crop } from './Crop';
import { Mirror } from './Mirror';
import { Rotate } from './Rotate';
import { Speed } from './Speed';
import { Reverse } from './Reverse';
import { FreezeFrame } from './FreezeFrame';
import { Volume } from './Volume';
import { Mute } from './Mute';
import { Voiceover } from './Voiceover';
import { DetachAudio } from './DetachAudio';
import { Keyframe } from './Keyframe';
import { ZoomIn } from './ZoomIn';
import { ZoomOut } from './ZoomOut';
import { Snap } from './Snap';
import { Link } from './Link';
import { Unlink } from './Unlink';
import { Lock } from './Lock';
import { Eye } from './Eye';
import { EyeOff } from './EyeOff';
import { Play } from './Play';
import { Pause } from './Pause';
import { SkipBack } from './SkipBack';
import { SkipForward } from './SkipForward';
import { FrameStep } from './FrameStep';
import { Fullscreen } from './Fullscreen';
import { Marker } from './Marker';
import { Layers } from './Layers';
import { Blend } from './Blend';
import { Opacity } from './Opacity';
import { BackgroundRemove } from './BackgroundRemove';
import { Beauty } from './Beauty';
import { Close } from './Close';
import { ChevronDown } from './ChevronDown';
import { Search } from './Search';
import { Keyboard } from './Keyboard';
import { Fit } from './Fit';
import { Check } from './Check';
import { Folder } from './Folder';

export const iconComponents = {
  'media': Media,
  'audio': Audio,
  'text': Text,
  'stickers': Stickers,
  'effects': Effects,
  'transitions': Transitions,
  'captions': Captions,
  'filters': Filters,
  'adjustment': Adjustment,
  'templates': Templates,
  'import': Import,
  'export': Export,
  'settings': Settings,
  'undo': Undo,
  'redo': Redo,
  'select': Select,
  'split': Split,
  'delete': Delete,
  'trim-left': TrimLeft,
  'trim-right': TrimRight,
  'ripple': Ripple,
  'crop': Crop,
  'mirror': Mirror,
  'rotate': Rotate,
  'speed': Speed,
  'reverse': Reverse,
  'freeze-frame': FreezeFrame,
  'volume': Volume,
  'mute': Mute,
  'voiceover': Voiceover,
  'detach-audio': DetachAudio,
  'keyframe': Keyframe,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'snap': Snap,
  'link': Link,
  'unlink': Unlink,
  'lock': Lock,
  'eye': Eye,
  'eye-off': EyeOff,
  'play': Play,
  'pause': Pause,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  'frame-step': FrameStep,
  'fullscreen': Fullscreen,
  'marker': Marker,
  'layers': Layers,
  'blend': Blend,
  'opacity': Opacity,
  'background-remove': BackgroundRemove,
  'beauty': Beauty,
  'close': Close,
  'chevron-down': ChevronDown,
  'search': Search,
  'keyboard': Keyboard,
  'fit': Fit,
  'check': Check,
  'folder': Folder,
} as const;
export type IconName = keyof typeof iconComponents;

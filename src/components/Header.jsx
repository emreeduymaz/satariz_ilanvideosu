import Colors from '../theme/colors';
import { FaktorelGenislik, HeaderHeight, FRAME_WIDTH } from '../utils/scale';
import { useSafeAreaInsets } from '../hooks/useSafeArea';
import DefaultTextStyle from './DefaultTextStyle';
import HeaderChevronLeftIcon from './icons/HeaderChevronLeftIcon';
import HeaderHeartIcon from './icons/HeaderHeartIcon';
import MdiIcon from '@mdi/react';
import { mdiExportVariant } from '@mdi/js';

export default function Header({
  leftIcon = false,
  leftAction,
  rightType,
  rightDoneAction,
  doneText = 'Done',
  rightHeartIcon,
  rightHeartAction,
  heartStatus,
  rightShareIcon,
  rightShareAction,
  windowWidth = FRAME_WIDTH,
}) {
  const insets = useSafeAreaInsets();

  // Extend the header background upward without moving inner content.
  // If safe-area inset is unavailable (e.g., in mockups/videos), use a fallback.
  const extraTop = insets.top < 1 ? FaktorelGenislik(35) : insets.top;
  const containerHeight = HeaderHeight + extraTop;

  return (
    <div
      style={{
        height: containerHeight,
        backgroundColor: Colors.primary,
        width: FRAME_WIDTH,
        // Keep content positioned at original y by stacking a top filler area
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top filler to extend orange into the safe area / mockup notch */}
      <div style={{ height: extraTop, width: '100%' }} />
      <div
        style={{
          height: HeaderHeight,
          // Remove marginTop so content doesn't shift; filler above handles space
          marginTop: 0,
          flexDirection: 'row',
          display: 'flex',
        }}
      >
        <button
          style={{
            width: FaktorelGenislik(40),
            paddingTop: FaktorelGenislik(15),
            height: HeaderHeight,
            justifyContent: 'flex-start',
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'row',
            background: 'transparent',
            border: 'none',
            cursor: leftIcon ? 'pointer' : 'default',
          }}
          onClick={leftIcon ? leftAction : undefined}
        >
          {leftIcon ? (
            <span style={{ margin: -FaktorelGenislik(18) }}>
              <HeaderChevronLeftIcon size={FaktorelGenislik(30)} stroke={Colors.white} />
            </span>
          ) : null}
        </button>
        <div
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
            flex: 1,
            height: HeaderHeight,
            flexDirection: 'row',
            gap: FaktorelGenislik(20),
            
          }}
        >
          <DefaultTextStyle
            style={{ marginLeft: FaktorelGenislik(25) }}
            color={Colors.white}
            fontType={'bold'}
            fontSize={FaktorelGenislik(14)}
          >
            İlan Detayı
          </DefaultTextStyle>
        </div>
        <div
          style={{
            width: FaktorelGenislik(70),
            height: HeaderHeight,
            justifyContent: 'flex-end',
            alignItems: 'center',
            display: 'flex',
          }}
        >
          {rightType === 'done' ? (
            <button
              style={{
                justifyContent: 'flex-end',
                alignItems: 'center',
                display: 'flex',
                width: FaktorelGenislik(70),
                flexDirection: 'row',
                background: 'transparent',
                border: 'none',
                color: Colors.white,
                cursor: 'pointer',
              }}
              onClick={rightDoneAction}
            >
              <DefaultTextStyle
                color={Colors.white}
                fontType={'bold'}
                fontSize={FaktorelGenislik(14)}
              >
                {doneText}
              </DefaultTextStyle>
            </button>
          ) : rightType === 'icon' ? (
            <div
              style={{
                justifyContent: 'flex-end',
                alignItems: 'center',
                display: 'flex',
                width: '100%',
                flexDirection: 'row',
                gap: FaktorelGenislik(2),
              }}
            >
              {rightHeartIcon ? (
                <button
                  style={{

                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    display: 'flex',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    marginRight: FaktorelGenislik(-25),
                  }}
                  onClick={rightHeartAction}
                >
                  <HeaderHeartIcon size={FaktorelGenislik(22)} fill={'none'} stroke={Colors.white} />
                </button>
              ) : null}
              {rightShareIcon ? (
                <button
                  style={{
                    marginRight: FaktorelGenislik(12),
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    display: 'flex',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={rightShareAction}
                >
                  <MdiIcon path={mdiExportVariant} size={FaktorelGenislik(22) / 24} color={Colors.white} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}



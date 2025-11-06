import DefaultTextStyle from '../DefaultTextStyle';
import { FaktorelGenislik } from '../../utils/scale';

export function ThreeTabs({
  TabRef = null,
  width = FaktorelGenislik(345),
  height = FaktorelGenislik(38),
  marginTop = FaktorelGenislik(5),
  marginBottom = FaktorelGenislik(12),
  OneTabIcon = null,
  oneText,
  oneButtonPress,
  TwoTabIcon = null,
  twoText,
  twoButtonPress,
  ThreeTabIcon = null,
  threeText,
  threeButtonPress,
  activeBackgroundColor,
  activeTextColor,
  passiveBackgroundColor,
  passiveTextColor,
  tab,
  separate = true,
  firstTabStatus = true,
  middleTabStatus = true,
  lastTabStatus = true,
}) {
  const isOne = tab === 'one';
  const isTwo = tab === 'two';
  const isThree = tab === 'three';

  if (!separate) {
    return (
      <div
        ref={TabRef}
        style={{
          height,
          marginTop,
          marginBottom,
          width,
          borderRadius: 5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'center',
        }}
      >
        <button
          onClick={oneButtonPress}
          style={{
            height,
            flex: 1,
            background: isOne ? activeBackgroundColor : passiveBackgroundColor,
            backgroundColor: isOne ? activeBackgroundColor : passiveBackgroundColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderTopLeftRadius: 5,
            borderBottomLeftRadius: 5,
            border: 'none',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            color: isOne ? activeTextColor : passiveTextColor,
            WebkitTextFillColor: isOne ? activeTextColor : passiveTextColor,
          }}
        >
          {OneTabIcon ? <span style={{ marginRight: FaktorelGenislik(5) }}>{OneTabIcon}</span> : null}
          <DefaultTextStyle color={isOne ? activeTextColor : passiveTextColor} fontType={'bold'} fontSize={FaktorelGenislik(11)}>
            {oneText}
          </DefaultTextStyle>
        </button>
        <button
          onClick={twoButtonPress}
          style={{
            height,
            flex: 1,
            background: isTwo ? activeBackgroundColor : passiveBackgroundColor,
            backgroundColor: isTwo ? activeBackgroundColor : passiveBackgroundColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: 'none',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            color: isTwo ? activeTextColor : passiveTextColor,
            WebkitTextFillColor: isTwo ? activeTextColor : passiveTextColor,
          }}
        >
          {TwoTabIcon ? <span style={{ marginRight: FaktorelGenislik(5) }}>{TwoTabIcon}</span> : null}
          <DefaultTextStyle color={isTwo ? activeTextColor : passiveTextColor} fontType={'bold'} fontSize={FaktorelGenislik(11)}>
            {twoText}
          </DefaultTextStyle>
        </button>
        {lastTabStatus ? (
          <button
            onClick={threeButtonPress}
          style={{
              height,
              flex: 1,
              background: isThree ? activeBackgroundColor : passiveBackgroundColor,
              backgroundColor: isThree ? activeBackgroundColor : passiveBackgroundColor,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderTopRightRadius: 5,
              borderBottomRightRadius: 5,
              border: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              color: isThree ? activeTextColor : passiveTextColor,
              WebkitTextFillColor: isThree ? activeTextColor : passiveTextColor,
            }}
          >
            {ThreeTabIcon ? <span style={{ marginRight: FaktorelGenislik(5) }}>{ThreeTabIcon}</span> : null}
            <DefaultTextStyle color={isThree ? activeTextColor : passiveTextColor} fontType={'bold'} fontSize={FaktorelGenislik(11)}>
              {threeText}
            </DefaultTextStyle>
          </button>
        ) : null}
      </div>
    );
  }

  const allVisible = firstTabStatus && middleTabStatus && lastTabStatus;
  const buttonWidth = allVisible ? FaktorelGenislik(110) : FaktorelGenislik(170);
  const justifyContent = allVisible ? 'space-between' : 'space-around';

  return (
    <div
      ref={TabRef}
      style={{
        height,
        marginTop,
        marginBottom,
        width,
        borderRadius: 5,
        display: 'flex',
        justifyContent,
        alignItems: 'center',
        alignSelf: 'center',
      }}
    >
      {firstTabStatus ? (
        <button
          onClick={oneButtonPress}
          style={{
            height,
            width: buttonWidth,
            background: isOne ? activeBackgroundColor : passiveBackgroundColor,
            backgroundColor: isOne ? activeBackgroundColor : passiveBackgroundColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            color: isOne ? activeTextColor : passiveTextColor,
            WebkitTextFillColor: isOne ? activeTextColor : passiveTextColor,
          }}
        >
          {OneTabIcon ? <span style={{ marginRight: FaktorelGenislik(5) }}>{OneTabIcon}</span> : null}
          <DefaultTextStyle color={isOne ? activeTextColor : passiveTextColor} fontType={'bold'} fontSize={FaktorelGenislik(11)}>
            {oneText}
          </DefaultTextStyle>
        </button>
      ) : null}

      {middleTabStatus ? (
        <button
          onClick={twoButtonPress}
          style={{
            height,
            width: buttonWidth,
            background: isTwo ? activeBackgroundColor : passiveBackgroundColor,
            backgroundColor: isTwo ? activeBackgroundColor : passiveBackgroundColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            color: isTwo ? activeTextColor : passiveTextColor,
            WebkitTextFillColor: isTwo ? activeTextColor : passiveTextColor,
          }}
        >
          {TwoTabIcon ? <span style={{ marginRight: FaktorelGenislik(5) }}>{TwoTabIcon}</span> : null}
          <DefaultTextStyle color={isTwo ? activeTextColor : passiveTextColor} fontType={'bold'} fontSize={FaktorelGenislik(11)}>
            {twoText}
          </DefaultTextStyle>
        </button>
      ) : null}

      {lastTabStatus ? (
        <button
          onClick={threeButtonPress}
          style={{
            height,
            width: buttonWidth,
            background: isThree ? activeBackgroundColor : passiveBackgroundColor,
            backgroundColor: isThree ? activeBackgroundColor : passiveBackgroundColor,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            color: isThree ? activeTextColor : passiveTextColor,
            WebkitTextFillColor: isThree ? activeTextColor : passiveTextColor,
          }}
        >
          {ThreeTabIcon ? <span style={{ marginRight: FaktorelGenislik(5) }}>{ThreeTabIcon}</span> : null}
          <DefaultTextStyle color={isThree ? activeTextColor : passiveTextColor} fontType={'bold'} fontSize={FaktorelGenislik(11)}>
            {threeText}
          </DefaultTextStyle>
        </button>
      ) : null}
    </div>
  );
}

export function TwoTabs({
  height = 30,
  fontType = 'medium',
  oneText,
  oneButtonPress,
  twoText,
  twoButtonPress,
  tab,
}) {
  const isOne = tab === 'one';
  const isTwo = tab === 'two';
  const base = {
    height,
    padding: '0 10px',
    borderRadius: 6,
    cursor: 'pointer',
    border: '1px solid rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
  };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={oneButtonPress} style={{ ...base, opacity: isOne ? 1 : 0.8 }}>
        <DefaultTextStyle fontType={fontType}>{oneText}</DefaultTextStyle>
      </button>
      <button onClick={twoButtonPress} style={{ ...base, opacity: isTwo ? 1 : 0.8 }}>
        <DefaultTextStyle fontType={fontType}>{twoText}</DefaultTextStyle>
      </button>
    </div>
  );
}



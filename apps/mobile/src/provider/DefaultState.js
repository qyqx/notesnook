export const defaultState = {
  isMenuOpen: {
    current: false,
  },
  selectionMode: false,
  selectedItemsList: [],
  notes: [],
  notebooks: [],
  trash: [],
  favorites: [],
  syncing: false,
  pinned: {
    notes: [],
    notebooks: [],
  },
  tags: [],
  colorNotes: [],
  user: {},
  premiumUser:true,
  settings: {
    showToolbarOnTop: false,
    showKeyboardOnOpen: false,
    fontScale: 1,
    forcePortraitOnTablet: false,
    useSystemTheme:true,
    reminder:'weekly',
    encryptedBackups:false
  },
  currentScreen: 'home',
  colors: {
    night: false,
    bg: 'white',
    fg: '#0560FF',
    navbg: '#f6fbfc',
    nav: '#f0f0f0',
    pri: 'black',
    sec: 'white',
    accent: '#0560FF',
    shade: '#0560FF12',
    normal: 'black',
    icon: 'gray',
    errorBg: '#FFD2D2',
    errorText: '#D8000C',
    successBg: '#DFF2BF',
    successText: '#4F8A10',
    warningBg: '#FEEFB3',
    warningText: '#9F6000',
  },
  preventDefaultMargins: false,
  isLoginNavigator: false,
  currentEditingNote: null,
  loading: true,
  searchResults: {
    results: [],
    type: null,
    keyword: null,
  },
  headerMenuState: true,
  headerTextState: {
    heading: 'Home',
    color: null,
  },
  headerVerticalMenu: true,
  searchState: {
    noSearch: false,
    data: [],
    type: 'notes',
    color: null,
    placeholder: 'Search all notes',
  },
  containerBottomButton: {
    visible: true,
    bottomButtonOnPress: () => {},
    bottomButtonText: 'Create a new note',
  },
  messageBoardState: {
    visible:false,
    message:null,
    actionText:null,
    onPress:() => {},
    data:{},
    icon:'account-outline'
  },
  keyword: [],
};

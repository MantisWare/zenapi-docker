// import { LOCATION_CHANGE } from 'react-router-redux';
import { forEach, set, map, replace } from 'lodash';
import {
  all,
  call,
  // take,
  put,
  fork,
  // cancel,
  select,
  takeLatest,
} from 'redux-saga/effects';
import request from 'utils/request';
// selectors
import { makeSelectModifiedData } from './selectors';
import {
  CONFIG_FETCH,
  EDIT_SETTINGS,
  LANGUAGE_DELETE,
  LANGUAGES_FETCH,
  NEW_LANGUAGE_POST,
  DATABASES_FETCH,
  NEW_DATABASE_POST,
  DATABASE_DELETE,
  SPECIFIC_DATABASE_FETCH,
  DATABASE_EDIT,
} from './constants';
import {
  configFetchSucceded,
  databasesFetchSucceeded,
  editSettingsSucceeded,
  languagesFetchSucceeded,
  languageActionError,
  languageActionSucceeded,
  databaseActionSucceeded,
  specificDatabaseFetchSucceeded,
  databaseActionError,
  unsetLoader,
  setLoader,
} from './actions';

/* eslint-disable no-template-curly-in-string */

export function* editDatabase(action) {
  try {
    const body = {};

    forEach(action.data, (value, key) => {
      set(body, key, value);
    });

    const opts = {
      method: 'PUT',
      body,
    };
    const requestUrl = `/settings-manager/configurations/databases/${action.apiUrl}`;
    
    action.context.emitEvent('willEditDatabaseSettings');
    
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      action.context.emitEvent('didEditDatabaseSettings');
      
      zenapi.notification.success('settings-manager.zenapi.notification.success.databaseEdit');
      yield put(databaseActionSucceeded());
    }
  } catch(error) {
    action.context.emitEvent('didNotEditDatabaseSettings');
    const formErrors = map(error.response.payload.message, err => ({ target: err.target, errors: map(err.messages, mess => ({ id: `settings-manager.${mess.id}`})) }));

    yield put(databaseActionError(formErrors));
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* deleteDatabase(action) {
  try {
    const opts = { method: 'DELETE' };
    const requestUrl = `/settings-manager/configurations/databases/${action.databaseToDelete}/${action.endPoint}`;

    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      yield call(action.context.disableGlobalOverlayBlocker);
      zenapi.notification.success('settings-manager.zenapi.notification.success.databaseDeleted');
    }
  } catch(error) {
    yield call(action.context.disableGlobalOverlayBlocker);
    yield put(databaseActionError([]));
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* deleteLanguage(action) {
  try {
    const opts = {
      method: 'DELETE',
    };
    const requestUrl = `/settings-manager/configurations/languages/${action.languageToDelete}`;
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      zenapi.notification.success('settings-manager.zenapi.notification.success.languageDelete');
    }
  } catch(error) {
    yield put(languageActionError());
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* fetchConfig(action) {
  try {
    const opts = {
      method: 'GET',
    };
    const requestUrl = `/settings-manager/configurations/${action.endPoint}`;

    const data = yield call(request, requestUrl, opts);
    yield put(configFetchSucceded(data));
  } catch(error) {
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}


export function* fetchDatabases(action) {
  try {
    const opts = {
      method: 'GET',
    };
    const requestUrlListDatabases = `/settings-manager/configurations/databases/${action.environment}`;
    const requestUrlAppDatabases = '/settings-manager/configurations/database/model';

    const [listDatabasesData, appDatabaseData] = yield all([
      call(request, requestUrlListDatabases, opts),
      call(request, requestUrlAppDatabases, opts),
    ]);
    yield put(databasesFetchSucceeded(listDatabasesData, appDatabaseData));
  } catch(error) {
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* fetchLanguages() {
  try {
    const opts = {
      method: 'GET',
    };
    const requestUrlAppLanguages = '/settings-manager/configurations/languages';
    const requestUrlListLanguages = '/settings-manager/configurations/i18n';

    const [appLanguagesData, listLanguagesData] = yield all([
      call(request, requestUrlAppLanguages, opts),
      call(request, requestUrlListLanguages, opts),
    ]);
    yield put(languagesFetchSucceeded(appLanguagesData, listLanguagesData));
  } catch(error) {
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* postLanguage() {
  try {
    const newLanguage = yield select(makeSelectModifiedData());
    const body = {
      name: newLanguage['language.defaultLocale'],
    };
    const opts = {
      body,
      method: 'POST',
    };
    const requestUrl = '/settings-manager/configurations/languages';
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      yield put(languageActionSucceeded());
      zenapi.notification.success('settings-manager.zenapi.notification.success.languageAdd');
    }
  } catch(error) {
    yield put(languageActionError());
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* postDatabase(action) {
  try {
    const body = {};

    forEach(action.data, (value, key) => {
      set(body, key, value);
    });

    const opts = {
      method: 'POST',
      body,
    };
    action.context.emitEvent('willAddDatabaseSettings');
    const requestUrl = `/settings-manager/configurations/databases/${action.endPoint}`;
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      action.context.emitEvent('didAddDatabaseSettings');
      yield put(databaseActionSucceeded());
      zenapi.notification.success('settings-manager.zenapi.notification.success.databaseAdd');
    }
  } catch(error) {
    action.context.emitEvent('didNotAddDatabaseSettings')
    const formErrors = map(error.response.payload.message, (err) => {
      const target = err.target ? replace(err.target, err.target.split('.')[2], '${name}') : 'database.connections.${name}.name';
      return (
        { target, errors: map(err.messages, mess => ({ id: `settings-manager.${mess.id}`})) }
      );
    });

    yield put(databaseActionError(formErrors));
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

export function* settingsEdit(action) {
  try {
    // Show button loader
    yield put(setLoader());

    const opts = {
      body: action.newSettings,
      method: 'PUT',
    };
    
    action.context.emitEvent('willEditSettings', { category : action.endPoint });
    
    const requestUrl = `/settings-manager/configurations/${action.endPoint}`;
    const resp = yield  call(request, requestUrl, opts, true);

    if (resp.ok) {
      action.context.emitEvent('didEditSettings', { category : action.endPoint });
      yield put(editSettingsSucceeded());
      zenapi.notification.success('settings-manager.zenapi.notification.success.settingsEdit');
    }
  } catch (error) {
    action.context.emitEvent('didNotEditSettings', { error });
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  } finally {
    yield put(unsetLoader());
  }
}

export function* fetchSpecificDatabase(action) {
  try {
    const opts = {
      method: 'GET',
    };
    const requestUrl = `/settings-manager/configurations/databases/${action.databaseName}/${action.endPoint}`;
    const data = yield call(request, requestUrl, opts);

    yield put(specificDatabaseFetchSucceeded(data));
  } catch(error) {
    zenapi.notification.error('settings-manager.zenapi.notification.error');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  yield fork(takeLatest, LANGUAGES_FETCH, fetchLanguages);
  yield fork(takeLatest, EDIT_SETTINGS, settingsEdit);
  yield fork(takeLatest, NEW_LANGUAGE_POST, postLanguage);
  yield fork(takeLatest, LANGUAGE_DELETE, deleteLanguage);
  yield fork(takeLatest, DATABASES_FETCH, fetchDatabases);
  yield fork(takeLatest, NEW_DATABASE_POST, postDatabase);
  yield fork(takeLatest, DATABASE_DELETE, deleteDatabase);
  yield fork(takeLatest, SPECIFIC_DATABASE_FETCH, fetchSpecificDatabase);
  yield fork(takeLatest, DATABASE_EDIT, editDatabase);

  // TODO Fix router (Other PR)
  // const loadConfigWatcher = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  // const loadLanguagesWatcher = yield fork(takeLatest, LANGUAGES_FETCH, fetchLanguages);
  // const editConfigWatcher = yield fork(takeLatest, EDIT_SETTINGS, settingsEdit);
  // const postLanguageWatcher = yield fork(takeLatest, NEW_LANGUAGE_POST, postLanguage);
  // const deleteLanguageWatcher = yield fork(takeLatest, LANGUAGE_DELETE, deleteLanguage);
  // const loadDatabasesWatcher = yield fork(takeLatest, DATABASES_FETCH, fetchDatabases);
  // const postDatabaseWatcher = yield fork(takeLatest, NEW_DATABASE_POST, postDatabase);
  // const deleteDatabaseWatcher = yield fork(takeLatest, DATABASE_DELETE, deleteDatabase);
  // const fetchSpecificDatabaseWatcher = yield fork(takeLatest, SPECIFIC_DATABASE_FETCH, fetchSpecificDatabase);
  // const editDatabaseWatcher = yield fork(takeLatest, DATABASE_EDIT, editDatabase);

  // yield take(LOCATION_CHANGE);
  // yield cancel(loadConfigWatcher);
  // yield cancel(loadLanguagesWatcher);
  // yield cancel(editConfigWatcher);
  // yield cancel(postLanguageWatcher);
  // yield cancel(deleteLanguageWatcher);
  // yield cancel(loadDatabasesWatcher);
  // yield cancel(postDatabaseWatcher);
  // yield cancel(deleteDatabaseWatcher);
  // yield cancel(fetchSpecificDatabaseWatcher);
  // yield cancel(editDatabaseWatcher);
}

// All sagas to be loaded
export default defaultSaga;

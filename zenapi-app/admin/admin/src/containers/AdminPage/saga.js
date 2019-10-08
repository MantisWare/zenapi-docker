import { all, fork, call, put, select, takeLatest } from 'redux-saga/effects';
import auth from 'utils/auth';
import request from 'utils/request';
import { makeSelectAppPlugins } from '../App/selectors';
import {
  getAdminDataSucceeded,
} from './actions';
import { makeSelectUuid } from './selectors';
import { EMIT_EVENT, GET_ADMIN_DATA } from './constants';

function* emitter(action) {
  //
}

function* getData() {
  try {
    const appPlugins = yield select(makeSelectAppPlugins());
    const hasUserPlugin = appPlugins.indexOf('users-permissions') !== -1;

    if (hasUserPlugin && auth.getToken() !== null) {
      yield call(request, `${zenapi.backendURL}/users/me`, { method: 'GET' });
    }

    const [{ uuid }, { zenapiVersion }, { currentEnvironment }, { layout }] = yield all([
      call(request, '/admin/gaConfig', { method: 'GET' }),
      call(request, '/admin/zenapiVersion', { method: 'GET' }),
      call(request, '/admin/currentEnvironment', { method: 'GET' }),
      call(request, '/admin/layout', { method: 'GET' }),
    ]);
    yield put(getAdminDataSucceeded({ uuid, zenapiVersion, currentEnvironment, layout }));

  } catch(err) {
    console.log(err); // eslint-disable-line no-console
  }
}

function* defaultSaga() {
  yield all([
    fork(takeLatest, GET_ADMIN_DATA, getData),
    fork(takeLatest, EMIT_EVENT, emitter),
  ]);
}

export default defaultSaga;

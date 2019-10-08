import 'whatwg-fetch';
import { dropRight, take } from 'lodash';
import removeMd from 'remove-markdown';
import { all, call, fork, put, select, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';
import { submitSucceeded } from './actions';
import { SUBMIT } from './constants';
import { makeSelectBody } from './selectors';

function* submit() {
  try {
    
  } catch (err) {
    // silent
  }
}

function* defaultSaga() {
  yield all([
    fork(takeLatest, SUBMIT, submit),
  ]);
}

export default defaultSaga;

/**
*
* LeftMenuFooter
*
*/

import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { PropTypes } from 'prop-types';

import LeftMenuLink from '../LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';
defineMessages(messages);

function LeftMenuFooter({ version }) { // eslint-disable-line react/prefer-stateless-function
  let currentUrl = window.location.hostname;
  return (
    <div className={styles.leftMenuFooter}>
      <ul className={styles.list}>
        <LeftMenuLink
          icon="book"
          label={messages.documentation.id}
          destination={`http://${currentUrl}:5030`}
        />
      </ul>
      <div className={styles.poweredBy}>
        <FormattedMessage {...messages.poweredBy} />
        Zenapi v{version}
      </div>
    </div>
  );
}

LeftMenuFooter.propTypes = {
  version: PropTypes.string.isRequired,
};

export default LeftMenuFooter;

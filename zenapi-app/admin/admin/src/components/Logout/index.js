/**
*
* Logout
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import auth from 'utils/auth';

import styles from './styles.scss';

class Logout extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { isOpen: false };

  handleGoTo = () => {
    const id = get(auth.getUserInfo(), 'id') || get(auth.getUserInfo(), '_id');
    this.context.router.history.push({
      pathname: `/plugins/content-manager/user/${id}`,
      search: '?redirectUrl=/plugins/content-manager/user/?page=0&limit=0&sort=id&source=users-permissions',
    });
  }

  handleRestart = () => {
    console.log('Restart Coming soon...');
  }

  handleLogout = () => {
    auth.clearAppStorage();
    this.context.router.history.push('/plugins/users-permissions/auth/login');
  }

  toggle = () => this.setState({ isOpen: !this.state.isOpen });

  render() {
    return (
      <div className={styles.logout}>
        <ButtonDropdown isOpen={this.state.isOpen} toggle={this.toggle}>
          <DropdownToggle>
            {get(auth.getUserInfo(), 'username')}
            <i className="fa fa-caret-down" alt={`${this.state.isOpen}`} />
          </DropdownToggle>
          <DropdownMenu className={styles.dropDownContent}>
            <DropdownItem onClick={this.handleGoTo} className={styles.item}>
              <FormattedMessage id="app.components.Logout.profile" />
            </DropdownItem>
            <DropdownItem onClick={this.handleRestart} className={styles.itemRestart}>
              <FormattedMessage id="app.components.Logout.restart" />
            </DropdownItem>
            <DropdownItem onClick={this.handleLogout}>
              <FormattedMessage id="app.components.Logout.logout" />
              <i className="fa fa-sign-out" />
            </DropdownItem>
          </DropdownMenu>
        </ButtonDropdown>
      </div>
    );
  }
}


Logout.contextTypes = {
  router: PropTypes.object,
};

export default Logout;

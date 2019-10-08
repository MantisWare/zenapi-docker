/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { FormattedMessage } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';
import { get, isEmpty, upperFirst } from 'lodash';
import cn from 'classnames';

import Button from 'components/Button';
import Input from 'components/InputText';
import auth from 'utils/auth';
import validateInput from 'utils/inputsValidations';

import Block from '../../components/HomePageBlock';
import Sub from '../../components/Sub';

import { selectPlugins } from '../App/selectors';

import injectReducer from '../../utils/injectReducer';
import injectSaga from '../../utils/injectSaga';

import BlockLink from './BlockLink';
import CommunityContent from './CommunityContent';
import CreateContent from './CreateContent';
import WelcomeContent from './WelcomeContent';

import { onChange, submit } from './actions';
import makeSelectHomePage from './selectors';
import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';

const FIRST_BLOCK = [
  {
    title: {
      id: 'app.components.HomePage.welcome',
    },
    content: () => <WelcomeContent />,
  },
  {
    title: {
      id: 'app.components.HomePage.create',
    },
    content: () => <CreateContent />,
  },
];

export class HomePage extends React.PureComponent {
  // eslint-disable-line react/prefer-stateless-function
  state = { errors: [] };

  handleSubmit = e => {
    e.preventDefault();
    const errors = validateInput(
      this.props.homePage.body.email,
      { required: true },
      'email',
    );
    this.setState({ errors });

    if (isEmpty(errors)) {
      return this.props.submit();
    }
  };

  showFirstBlock = () =>
    get(
      this.props.plugins.toJS(),
      'content-manager.leftMenuSections.0.links',
      [],
    ).length === 0;

  render() {
    const {
      homePage: { articles, body },
    } = this.props;
    const WELCOME_AGAIN_BLOCK = [
      {
        title: {
          id: 'app.components.HomePage.welcome.again',
        },
        name: upperFirst(`${get(auth.getUserInfo(), 'username')}!`),
        content: () => <WelcomeContent hasContent />,
      },
    ];

    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <Helmet title="Home Page" />
        <div className="row">
          <div className="col-md-8 col-lg-8">
            <Block>
              {this.showFirstBlock() &&
                FIRST_BLOCK.map((value, key) => (
                  <Sub
                    key={key}
                    {...value}
                    underline={key === 0}
                    bordered={key === 0}
                  />
                ))}
              {!this.showFirstBlock() &&
                WELCOME_AGAIN_BLOCK.concat(articles).map((value, key) => (
                  <Sub
                    key={key}
                    {...value}
                    bordered={key === 0}
                    style={key === 1 ? { marginBottom: '33px' } : {}}
                    underline={key === 0}
                  />
                ))}
            </Block>
          </div>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {
  homePage: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  plugins: PropTypes.object.isRequired,
  submit: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  homePage: makeSelectHomePage(),
  plugins: selectPlugins(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      onChange,
      submit,
    },
    dispatch,
  );
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

// export default connect(mapDispatchToProps)(HomePage);
export default compose(
  withReducer,
  withSaga,
  withConnect,
)(HomePage);

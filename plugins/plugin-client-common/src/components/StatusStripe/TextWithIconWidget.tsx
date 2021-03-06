/*
 * Copyright 2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react'
import { getCurrentTab } from '@kui-shell/core'

/** variants of how the information should be presented */
export type ViewLevel = 'removed' | 'hidden' | 'normal' | 'obscured' | 'ok' | 'warn' | 'error'

interface Props {
  text: string
  viewLevel: ViewLevel

  iconIsNarrow?: boolean
  iconOnclick?: string
  textOnclick?: string
  id?: string
}

export default class TextWithIconWidget extends React.PureComponent<Props> {
  public render() {
    const iconClassName =
      'kui--status-stripe-icon ' +
      (this.props.iconIsNarrow ? 'tiny-right-pad' : 'small-right-pad') +
      (this.props.iconOnclick ? ' clickable' : '')

    const iconPart = (
      <a
        href="#"
        className={iconClassName}
        onClick={this.props.iconOnclick ? () => getCurrentTab().REPL.pexec(this.props.iconOnclick) : undefined}
      >
        {this.props.children}
      </a>
    )

    const textPart = this.props.textOnclick ? (
      <a
        href="#"
        className="clickable kui--status-stripe-text"
        onClick={() => getCurrentTab().REPL.pexec(this.props.textOnclick)}
      >
        {this.props.text}
      </a>
    ) : (
      <span className="kui--status-stripe-text">{this.props.text}</span>
    )

    return (
      <div
        className={'kui--status-stripe-element' + (!this.props.id ? '' : ' ' + this.props.id)}
        data-view={this.props.viewLevel}
      >
        {iconPart}
        {textPart}
      </div>
    )
  }
}

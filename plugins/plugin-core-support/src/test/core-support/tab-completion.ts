/*
 * Copyright 2017-18 IBM Corporation
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

import { ISuite } from '@kui-shell/core/tests/lib/common'
import * as common from '@kui-shell/core/tests/lib/common' // tslint:disable-line:no-duplicate-imports
import * as ui from '@kui-shell/core/tests/lib/ui'
const { cli, keys, selectors, sidecar } = ui

/** execute the given async task n times */
const doTimes = (n, task) => {
  if (n > 0) {
    return task().then(() => doTimes(n - 1, task))
  } else {
    return Promise.resolve()
  }
}

describe('Tab completion', function (this: ISuite) {
  before(common.before(this))
  after(common.after(this))

  const tabby = (app, partial, full, expectOK = true) => app.client.waitForExist(ui.selectors.CURRENT_PROMPT_BLOCK)
    .then(() => app.client.getAttribute(ui.selectors.CURRENT_PROMPT_BLOCK, 'data-input-count'))
    .then(count => parseInt(count, 10))
    .then(count => app.client.setValue(ui.selectors.CURRENT_PROMPT, partial)
      .then(() => app.client.waitForValue(ui.selectors.PROMPT_N(count), partial))
      .then(() => app.client.setValue(ui.selectors.CURRENT_PROMPT, `${partial}${keys.TAB}`))
      .then(() => app.client.waitForValue(ui.selectors.PROMPT_N(count), full)))
    .then(() => new Promise(resolve => setTimeout(resolve, 500)))
    .then(() => cli.do('', app)) // "enter" to complete the repl
    .then(data => {
      if (expectOK) {
        return cli.expectOKWithAny(data)
      } else {
        return app
      }
    })
    .catch(common.oops(this))

  const tabbyWithOptions = (app, partial, expected?, full?, { click = undefined, nTabs = undefined, expectOK = true, iter = 0, expectedPromptAfterTab = undefined } = {}) => {
    return app.client.waitForExist(ui.selectors.CURRENT_PROMPT_BLOCK)
      .then(() => app.client.getAttribute(ui.selectors.CURRENT_PROMPT_BLOCK, 'data-input-count'))
      .then(count => parseInt(count, 10))
      .then(count => app.client.setValue(ui.selectors.CURRENT_PROMPT, partial)
        .then(() => app.client.waitForValue(ui.selectors.PROMPT_N(count), partial))
        .then(() => app.client.setValue(ui.selectors.CURRENT_PROMPT, `${partial}${keys.TAB}`))
        .then(() => {
          if (expectedPromptAfterTab) {
            return app.client.waitForValue(ui.selectors.PROMPT_N(count), expectedPromptAfterTab)
          }
        })
        .then(() => {
          if (!expected) {
            // then we expect non-visibility of the tab-completion popup
            // console.error('Expecting non-existence of popup')
            return app.client.waitForVisible(`${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary .clickable`, 10000, true)
              .then(() => {
                // great, the tab completion popup does not exist; early exit
                const err = new Error()
                err['failedAsExpected'] = true
                throw err
              })
          } else {
            const selector = `${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary .clickable`
            // console.error('Expecting existence of popup', selector)
            return app.client.waitForVisible(selector, 10000)
          }
        })
        .then(() => app.client.getText(`${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary .clickable`))
        .then(ui.expectArray(expected))
        // .then(() => { console.error('Got expected options') })
        .then(() => {
          if (click !== undefined) {
            // click on a row
            const selector = `${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary .tab-completion-option[data-value="${expected[click]}"] .clickable`
            // console.error('clicking', click, selector)
            return app.client.waitForVisible(selector, 10000)
              .then(() => app.client.click(selector))
          } else {
            // otherwise hit tab a number of times, to cycle to the desired entry
            // console.error('tabbing', nTabs)
            return doTimes(nTabs, () => app.client.keys('Tab'))
              .then(() => app.client.keys('Enter'))
          }
        })
        .then(() => app.client.waitForVisible(`${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary`, 8000, true)) // wait for non-existence of the temporary
        .then(() => app.client.waitForValue(ui.selectors.PROMPT_N(count), full)))
      .then(() => cli.do('', app))
      .then(data => {
        if (expectOK) {
          return cli.expectOKWithAny(data)
        } else {
          return app
        }
      })
      .catch(err => this.app.client.execute('repl.doCancel()') // clear the line
        .then(() => common.oops(this)(err)))
  }

  const tabbyWithOptionsThenCancel = (app, partial, expected) => app.client.waitForExist(ui.selectors.CURRENT_PROMPT_BLOCK)
    .then(() => app.client.getAttribute(ui.selectors.CURRENT_PROMPT_BLOCK, 'data-input-count'))
    .then(count => parseInt(count, 10))
    .then(count => app.client.setValue(ui.selectors.CURRENT_PROMPT, partial)
      .then(() => app.client.waitForValue(ui.selectors.PROMPT_N(count), partial))
      .then(() => app.client.setValue(ui.selectors.CURRENT_PROMPT, `${partial}${keys.TAB}`))
      .then(() => app.client.waitForVisible(`${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary .clickable`))
      .then(() => app.client.getText(`${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary .clickable`))
      .then(ui.expectArray(expected))
      .then(() => app.client.keys('ffffff')) // type something random
      .then(() => app.client.waitForVisible(`${ui.selectors.PROMPT_BLOCK_N(count)} .tab-completion-temporary`, 20000, true))) // wait for non-existence of the temporary
    .then(() => this.app.client.execute('repl.doCancel()')) // clear the line
    .catch(common.oops(this))

  it('should have an active repl', () => cli.waitForRepl(this.app))

  const options = ['core_empty.js', 'core_single_entry_directory/', 'core_test_directory_1/']

  const fileOptions = ['empty1.js', 'empty2.js']

  // tab completion using default file completion handler (i.e. if the
  // command does not register a usage model, then always tab
  // completion local files)
  it('should complete on the single-entry directory with git diff', () => tabby(this.app, 'git diff ./data/core/core_single_entry_dir',
    'git diff ./data/core/core_single_entry_directory/'))

  // tab completion of directories
  it('should complete on the single-entry directory', () => tabby(this.app, 'ls ./data/core/core_single_entry_dir',
    'ls ./data/core/core_single_entry_directory/'))

  // tab completion of a directory, auto-completing the single entry in the directory
  it('should complete on the single-entry directory', () => tabby(this.app, 'ls ./data/core/core_single_entry_directory/',
    'ls ./data/core/core_single_entry_directory/only_one_file_here_please.js'))

  // tab completion with options, then click on the second (idx=1) entry of the expected cmpletion list
  it('should tab complete local file path with options', () => tabbyWithOptions(this.app,
    'lls data/core/core_',
    options,
    'lls data/core/core_single_entry_dir/',
    { click: 1 }))

  it('should tab complete local file path with options, expect prompt update', () => tabbyWithOptions(this.app,
    'lls data/core/co',
    options,
    'lls data/core/core_single_entry_dir/',
    { click: 1,
      expectedPromptAfterTab: 'lls data/core_' }))

  // tab completion with file options, then click on the first (idx=0) entry of the expected cmpletion list
  it('should tab complete local file path with options', () => tabbyWithOptions(this.app,
    'lls data/core/core_test_directory_1/em',
    fileOptions,
    'lls data/core/core_test_directory_1/empty1.js',
    { click: 0 }))

  it('should tab complete the data directory', () => tabby(this.app, 'lls da', 'lls data/'))
  it('should tab complete the data/core/empty.js file', () => tabby(this.app, 'lls data/core/empty.js', 'lls data/core/empty.json'))
  it('should tab complete the ../packages/app directory', () => tabby(this.app, 'lls ../packages/ap', 'lls ../packages/app/'))

  // same, but this time tab to cycle through the options
  it('should tab complete local file path', () => tabbyWithOptions(this.app,
    'lls data/core/core_',
    options,
    'lls data/core/core_single_entry_dir/',
    { nTabs: 1 }))

  it('should tab complete local file path, then options go away on edit', () => tabbyWithOptionsThenCancel(this.app, 'lls data/core/core_',
    options))
})

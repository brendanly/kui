/*
 * Copyright 2018 IBM Corporation
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

import * as Debug from 'debug'
const debug = Debug('plugins/apache-composer/cmd/app-create')

import * as repl from '@kui-shell/core/core/repl'
import UsageError from '@kui-shell/core/core/usage-error'

import { create } from '../../utility/usage'
import * as view from '../../view/entity-view'
import * as compileUtil from '../../utility/compile'
import * as client from '../client'

export default async (commandTree, prequire) => {

  /* command handler for app create */
  commandTree.listen(`/wsk/app/create`, async ({ argvNoOptions, execOptions, parsedOptions }) => {
    // load and parse the source file to JSON-encoded composition and then deploy
    let inputFile = argvNoOptions[argvNoOptions.indexOf('create') + 2]
    let name = argvNoOptions[argvNoOptions.indexOf('create') + 1]
    if (!inputFile) {
      const implicitEntity = compileUtil.implicitInputFile(inputFile, name)
      inputFile = implicitEntity.inputFile
      name = implicitEntity.name

      if (!name || !inputFile) {
        debug('insufficient inputs')
        throw new UsageError(create('create'), undefined, 497)
      }
    }

    return compileUtil.sourceToComposition({ inputFile, name, recursive: parsedOptions.r || parsedOptions.recursive })
      .then(source => client.deploy({ composition: source, overwrite: false })
        .then(view.formatCompositionEntity(execOptions)))
      .catch(err => { throw err })
  }, { usage: create('create') })

  /* command handler for app update */
  commandTree.listen(`/wsk/app/update`, async ({ argvNoOptions, execOptions, parsedOptions }) => {
    // load and parse the source file to JSON-encoded composition and then deploy
    let inputFile = argvNoOptions[argvNoOptions.indexOf('update') + 2]
    let name = argvNoOptions[argvNoOptions.indexOf('update') + 1]
    if (!inputFile) {
      const implicitEntity = compileUtil.implicitInputFile(inputFile, name)
      inputFile = implicitEntity.inputFile
      name = implicitEntity.name

      if (!name || !inputFile) {
        debug('insufficient inputs')
        throw new UsageError(create('update'), undefined, 497)
      }
    }

    return compileUtil.sourceToComposition({ inputFile, name, recursive: parsedOptions.r || parsedOptions.recursive })
      .then(composition => client.deploy({ composition, overwrite: true })
        .then(view.formatCompositionEntity(execOptions)))
  }, { usage: create('update') })

}

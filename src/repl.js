import { createMachine, assign } from 'xstate';

export default function({ actions, services }) {
  return createMachine({
    initial: 'idle',
    context: {},
    states: {
      idle: {
        on: {
          change: 'compile'
        }
      },
      compile: {
        invoke: {
          src: 'compile',
          onDone: {
            target: 'idle',
            actions: [
              assign({
                js: (context, event) => event.data
              }),               'setCompiledOutput'
            ]
          },
          onError: 'error'
        }
      },
      error: {
        on: {
          change: 'compile'
        }
      }
    }
  }, {
    actions: {
      setCompiledOutput: actions.setCompiledOutput
    },
    services: {
      compile: services.compile
    }
  });
}
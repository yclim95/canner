/** @jsx builder */
// @flow

import {
  StringModel,
  NumberModel,
  BooleanModel,
  ArrayModel,
  ObjectModel,
  GeoPointModel,
  DateModel,
  FileModel,
  RootModel,
  RelationModel,
  ImageModel,
  ChartModel
} from './models';
import type {CannerSchema, Props} from './flow-types';
import {createLayoutVisitor, CANNER_KEY} from './layout';
import visitorManager from './visitorManager';
import validator from './validator';
import configuration from './configure';
import {parseConnector, parseConnectors, parseGraphqlClient,
  parseGraphqlClients, parseResolvers, getIntlMessage
} from './utils';

// layout
export const Layout = 'Layout';
export const Collapse = ({attributes, children}: Props) => <Layout component="collapse" {...attributes}>{children}</Layout>;
export const Block = ({attributes, children}: Props) => <Layout component="block" {...attributes}>{children}</Layout>;
export const Default = ({attributes, children}: Props) => <Layout component="default" {...attributes}>{children}</Layout>;
export const Tabs = ({attributes, children}: Props) => <Layout component="tabs" {...attributes}>{children}</Layout>;
export const Focus = ({attributes, children}: Props) => <Layout component="focus" {...attributes}>{children}</Layout>;
export const Condition = ({attributes, children}: Props) => <Layout component="condition" {...attributes}>{children}</Layout>;

// validator config
export const configure = configuration.configure;

// jsx pragma
export default function builder(tag: string | Function, attributes: Object, ...children: Array<CannerSchema>) {
  // flattern children
  children = children.reduce((result, child) => result.concat(child), [])
    .filter(child => child);
  children = (attributes || {}).children || children;
  if (typeof tag === 'function') {
    return tag({
      attributes,
      children
    });
  }
  attributes = attributes || {};
  attributes.title = getIntlMessage(attributes, 'title');
  attributes.description = getIntlMessage(attributes, 'description');
  switch(tag) {
    case 'string':
      return createJSON(StringModel, [attributes, children]);
    case 'number':
      return createJSON(NumberModel, [attributes, children]);
    case 'boolean':
      return createJSON(BooleanModel, [attributes, children]);
    case 'array':
      return createJSON(ArrayModel, [attributes, children]);
    case 'object':
      return createJSON(ObjectModel, [attributes, children]);
    case 'geoPoint':
      return createJSON(GeoPointModel, [attributes, children]);
    case 'dateTime':
      return createJSON(DateModel, [attributes, children]);
    case 'file':
      return createJSON(FileModel, [attributes, children]);
    case 'image':
      return createJSON(ImageModel, [attributes, children]);
    case 'relation':
      return createJSON(RelationModel, [attributes, children]);
    case 'chart':
      return createJSON(ChartModel, [attributes, children]);
    case 'root': {
      const renderView = {
        dict: attributes.dict || {},
        schema: new RootModel(attributes, children).toJson(),
        visitors: visitorManager.getAllVisitors(),
        storages: genStorages(attributes, children),
        connector: parseConnector(attributes, children) || parseConnectors(attributes, children),
        resolvers: parseResolvers(attributes, children),
        graphqlClient: parseGraphqlClient(attributes, children) || parseGraphqlClients(attributes, children)
      };
      if (typeof window === 'undefined') { 
        // support SSR
        return renderView;
      } else if (window && !window.document) {
        // CLI node env
        return {
          entry: children.map(child => child.keyName),
          storages: genStorages(children),
          resolvers: parseResolvers(attributes, children),
          connector: parseConnector(attributes, children) || parseConnectors(attributes, children),
          graphqlClient: parseGraphqlClient(attributes, children) || parseGraphqlClients(attributes, children)
        };
      } else {
        return renderView;
      }
    }
    case 'toolbar': {
      return children.reduce((result, child) => {
        result[child.type] = {
          ...child
        };
        return result;
      }, {
        __TOOLBAR__: true
      });
    }
    case 'sort': {
      return {
        ...attributes,
        type: 'sort'
      }
    }
    case 'pagination': {
      return {
        ...attributes,
        type: 'pagination'
      }
    }
    case 'filter': {
      return {
        ...attributes,
        type: 'filter'
      }
    }
    case 'Layout': {
      const {visitor, cannerKey} = createLayoutVisitor(attributes, children);
      visitorManager.addVisitor(visitor);
      return children.map(child => {
        if (child[CANNER_KEY]) {
          child[CANNER_KEY].push(cannerKey);
        } else {
          child[CANNER_KEY] = [cannerKey];
        }
        return child;
      });
    }
    default:
      throw new Error(`unsupported type '${tag}'`);
  }
}

function createJSON(Model: any, args: Array<*>) {
  let json = new Model(...args).toJson();
  validator.validate(json);
  return json;
}

function genStorages(attrs: Object, children: Array<*>) {
  return children.reduce((result: Object, child: Object): Object => {
    result[child.keyName] = child.storage ||attrs.storage || {};
    return result;
  }, {});
}
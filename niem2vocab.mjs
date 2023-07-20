
import libxmljs from "libxmljs";
import {readFileSync} from 'node:fs';
import {basename, dirname} from 'node:path';

const xsNamespace = {'xs': 'http://www.w3.org/2001/XMLSchema'};
const niemDirectory = dirname(process.argv[2]);
const niemFilename = basename(process.argv[2]);
const niemType = process.argv[3];

// load schema file
console.log('Loading schema from', niemFilename);
process.chdir(niemDirectory);
const niemFile = readFileSync(niemFilename);
const xsdModel = libxmljs.parseXml(niemFile);

// get base type
const typeModel = xsdModel.find(
  `//xs:complexType[@name="${niemType}"]`, xsNamespace)[0];
//console.log('Got model', typeModel);

const allClasses = {};
const allProperties = {};

function buildRdfClass(subModel) {
  //console.log("GASP", subModel.getAttribute('name').value());

  // add class information
  const rdfClass = {};
  rdfClass.id = subModel.getAttribute('name').value();
  rdfClass.label = rdfClass.id.match(/[A-Z][a-z]+|[0-9]+/g).join(' ');
  const comment = subModel.childNodes()[1].childNodes()[1].childNodes()[0].toString() + '.';
  rdfClass.comment = comment;
  allClasses[rdfClass.id] = rdfClass;
  //console.log("ADD CLASS", rdfClass);

  // get all properties for class
  subModel.childNodes().forEach(node => {
    //console.log('SM', node.name());
    if(node.name() === 'complexContent') {
      const elements = node.childNodes()[1].childNodes()[1].childNodes();
      elements.forEach(element => {
        if(element.name() === 'element') {
          const property = {};
          property.curie = element.getAttribute('ref').value();
          const propertyName = property.curie.split(':')[1];
          property.label = propertyName.match(/[A-Z][a-z]+|[0-9]+/g)?.join(' ');
          property.id = propertyName[0].toLowerCase() + propertyName.slice(1);
          //console.log('ELEMENT', property);
          //console.log('propertyName', propertyName);
          //console.log('ADD PROPERTY', property);
          allProperties[property.id] = property;

          const elementDefinition = subModel.find(
            `//xs:element[@name="${propertyName}"]`, xsNamespace)[0];
          if(elementDefinition) {
            //console.log('GED', elementDefinition.toString());
            const type = elementDefinition.getAttribute('type')?.value();
            //console.log('type', type);
            const comment = elementDefinition.childNodes()[1].childNodes()[1].childNodes()[0].toString() + '.';
            //console.log('COMMENT', comment);
            property.comment = comment;

            if(type) {
              property.range = type;
              const bareType = type.split(':')[1];
              const subTypeModel = subModel.find(
                `//xs:complexType[@name="${bareType}"]`, xsNamespace)[0];
              if(subTypeModel) {
                if(!(bareType in allClasses)) {
                  buildRdfClass(subTypeModel);
                }
              }
            }
          }
        }
      });
    }
  });
}

buildRdfClass(typeModel);

console.log('class:');
Object.values(allClasses).forEach(rdfClass => {
  console.log(`
  - id: ${rdfClass.id}
    label: ${rdfClass.label}
    comment: ${rdfClass.comment.replace(/\:/g, '-')}`);
});

console.log('property:');
Object.values(allProperties).forEach(rdfProperty => {
  console.log(`
  - id: ${rdfProperty.id}
    label: ${rdfProperty.label}`)

  if(rdfProperty.range) {
    console.log(`    range: ${rdfProperty.range}`);
  }
  if(rdfProperty.comment) {
    console.log(`    comment: ${rdfProperty.comment.replace(/\:/g, '-')}`);
  } else {
    console.log(`    comment: ${rdfProperty.label}`);
  }

});
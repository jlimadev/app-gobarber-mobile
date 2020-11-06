import React, { useCallback, useRef } from 'react';
import Icon from 'react-native-vector-icons/Feather';
import ImagePicker from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { FormHandles } from '@unform/core';
import * as Yup from 'yup';
import { Form } from '@unform/mobile';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../hooks/auth';
import api from '../../services/api';
import getValidationErrors from '../../utils/getValidationErrors';
import {
  BackButton,
  Container,
  Title,
  UserAvatar,
  UserAvatarButton,
} from './styles';

interface ProfileFormData {
  name: string;
  email: string;
  old_password: string;
  password: string;
  password_confirmation: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const emailInputRef = useRef<TextInput>(null);
  const oldPasswordInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const formRef = useRef<FormHandles>(null);
  const navigation = useNavigation();

  const saveProfileHandler = useCallback(
    async (data: ProfileFormData) => {
      try {
        formRef.current?.setErrors({});

        const schema = Yup.object().shape({
          name: Yup.string().required('Name required'),
          email: Yup.string()
            .required('E-mail required')
            .email('Type a valid e-mail'),
          old_password: Yup.string(),
          password: Yup.string().when('old_password', {
            is: val => !!val.length,
            then: Yup.string().required('Required field'),
            otherwise: Yup.string(),
          }),
          password_confirmation: Yup.string()
            .when('old_password', {
              is: val => !!val.length,
              then: Yup.string().required('Required field'),
              otherwise: Yup.string(),
            })
            .oneOf(
              [Yup.ref('password'), ''],
              'Password confirmation must match',
            ),
        });

        await schema.validate(data, {
          abortEarly: false,
        });

        const {
          name,
          email,
          old_password,
          password,
          password_confirmation,
        } = data;

        const formData = {
          name,
          email,
          ...(old_password
            ? {
                old_password,
                password,
                password_confirmation,
              }
            : {}),
        };

        const response = await api.put('/profile', formData);

        updateUser(response.data);

        Alert.alert('Profile updated successfully');

        navigation.goBack();
      } catch (err) {
        console.log(err);

        if (err instanceof Yup.ValidationError) {
          const errors = getValidationErrors(err);
          formRef.current?.setErrors(errors);
          return;
        }

        // it triggers a toast
        Alert.alert(
          'Profile update error',
          'It happened an error to update your profile, try again',
        );
      }
    },
    [navigation, updateUser],
  );

  const updateAvatarHandler = useCallback(() => {
    ImagePicker.showImagePicker(
      {
        title: 'Escolha uma imagem',
        cancelButtonTitle: 'Cancelar',
        takePhotoButtonTitle: 'Usar camera',
        chooseFromLibraryButtonTitle: 'Escolher da Galeria',
      },
      response => {
        if (response.didCancel) {
          return;
        }

        if (response.error) {
          Alert.alert('Erro ao atualizar seu avatar: ', response.error);
        }

        const data = new FormData();
        data.append('avatar', {
          type: 'image/jpeg',
          name: `${user.id}.jpg`,
          uri: response.uri,
        });

        api.patch('users/avatar', data).then(apiResponse => {
          updateUser(apiResponse.data);
        });
      },
    );
  }, [updateUser, user.id]);

  const goBackHandler = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        >
          <Container>
            <BackButton onPress={goBackHandler}>
              <Icon name="chevron-left" size={24} color="#999591" />
            </BackButton>

            <UserAvatarButton onPress={updateAvatarHandler}>
              <UserAvatar source={{ uri: user.avatar_url }} />
            </UserAvatarButton>

            <View>
              <Title>Meu perfil</Title>
            </View>

            <Form
              initialData={user}
              ref={formRef}
              onSubmit={saveProfileHandler}
            >
              <Input
                name="name"
                icon="user"
                placeholder="Name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
              <Input
                ref={emailInputRef}
                name="email"
                icon="mail"
                placeholder="E-mail"
                keyboardType="email-address"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => oldPasswordInputRef.current?.focus()}
              />
              <Input
                ref={oldPasswordInputRef}
                secureTextEntry
                textContentType="newPassword"
                name="old_password"
                icon="lock"
                placeholder="Senha Atual"
                returnKeyType="send"
                containerStyle={{ marginTop: 10 }}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              <Input
                ref={passwordInputRef}
                secureTextEntry
                textContentType="newPassword"
                name="password"
                icon="lock"
                placeholder="Nova Senha"
                returnKeyType="send"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              <Input
                ref={confirmPasswordInputRef}
                secureTextEntry
                textContentType="newPassword"
                name="password"
                icon="lock"
                placeholder="Confirme a nova senha"
                returnKeyType="send"
                onSubmitEditing={() => formRef.current?.submitForm()}
              />
              <Button onPress={() => formRef.current?.submitForm()}>
                Confirmar Mudanças
              </Button>
            </Form>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default Profile;
